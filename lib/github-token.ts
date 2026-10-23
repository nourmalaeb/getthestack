import "server-only";
import { createSign } from "node:crypto";

export const API = "https://api.github.com";

// Installation tokens last an hour. Refresh a bit early so a request never
// goes out with one that expires mid-flight.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

type AppConfig = { appId: string; installationId: string; privateKey: string };
type Cached = { token: string; expiresAt: number };

let cached: Cached | null = null;
let pending: Promise<Cached> | null = null;

function appConfig(): AppConfig | null {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  // Env UIs often flatten the PEM onto one line with literal "\n".
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (appId && installationId && privateKey) {
    return { appId, installationId, privateKey };
  }
  // A half-configured app would silently fall back to GITHUB_TOKEN or no
  // auth at all, which is the outage this exists to prevent.
  if (appId || installationId || privateKey) {
    throw new Error(
      "Set all of GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID and GITHUB_APP_PRIVATE_KEY, or none",
    );
  }
  return null;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

/** A short-lived JWT that authenticates as the app itself. */
function appJwt({ appId, privateKey }: AppConfig) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  // Backdate iat to tolerate clock drift; GitHub caps exp at 10 minutes.
  const payload = base64url(
    JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: appId }),
  );
  const signature = createSign("RSA-SHA256")
    .update(`${header}.${payload}`)
    .sign(privateKey);
  return `${header}.${payload}.${base64url(signature)}`;
}

async function mintInstallationToken(config: AppConfig): Promise<Cached> {
  const res = await fetch(
    `${API}/app/installations/${config.installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${appJwt(config)}`,
      },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`GitHub App token exchange failed: ${res.status}`);
  }
  const { token, expires_at } = (await res.json()) as {
    token: string;
    expires_at: string;
  };
  return { token, expiresAt: Date.parse(expires_at) };
}

/**
 * The token to send to the GitHub API: a GitHub App installation token when
 * the app is configured, else GITHUB_TOKEN (handy for local dev), else none.
 */
export async function getGitHubToken(): Promise<string | undefined> {
  const config = appConfig();
  if (!config) return process.env.GITHUB_TOKEN || undefined;

  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) {
    return cached.token;
  }
  // Share one exchange between concurrent requests.
  pending ??= mintInstallationToken(config).finally(() => {
    pending = null;
  });
  cached = await pending;
  return cached.token;
}

/**
 * Drop `token` if it's the cached installation token, e.g. after GitHub
 * rejects it. Returns whether it was, i.e. whether a retry would get a new one.
 */
export function invalidateGitHubToken(token: string | undefined) {
  if (!token || cached?.token !== token) return false;
  cached = null;
  return true;
}
