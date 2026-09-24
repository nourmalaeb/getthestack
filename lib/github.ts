import "server-only";

const API = "https://api.github.com";

// Stacks change as PRs are pushed/merged, but not second-to-second.
const REVALIDATE_SECONDS = 60;

export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Seconds until the rate limit resets, when that's why the call failed. */
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function gh<T>(
  path: string,
  accept = "application/vnd.github+json",
): Promise<T> {
  const headers: HeadersInit = { Accept: accept };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`${API}${path}`, {
    headers,
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    // Primary limit: remaining hits 0, reset is an epoch time. Secondary
    // limits: 403/429 with retry-after in seconds.
    const retryAfter = Number(res.headers.get("retry-after"));
    if (retryAfter > 0) {
      throw new GitHubError(
        res.status,
        "GitHub API rate limit exceeded",
        retryAfter,
      );
    }
    if (res.headers.get("x-ratelimit-remaining") === "0") {
      const reset = Number(res.headers.get("x-ratelimit-reset"));
      throw new GitHubError(
        res.status,
        "GitHub API rate limit exceeded",
        Math.max(1, Math.ceil(reset - Date.now() / 1000)) || 60,
      );
    }
    throw new GitHubError(res.status, `GitHub API ${res.status} for ${path}`);
  }
  return res.json();
}

export type StackPullRef = {
  number: number;
  state: "open" | "closed";
  draft: boolean;
  merged_at: string | null;
  head: { ref: string; sha: string };
};

export type Stack = {
  id: number;
  number: number;
  base: { ref: string };
  open: boolean;
  created_at: string;
  /** Ordered bottom of the stack (closest to base) to top. */
  pull_requests: StackPullRef[];
};

export type PullRequest = {
  number: number;
  title: string;
  /** Raw markdown of the description. */
  body?: string | null;
  /** GitHub-rendered, sanitized HTML of the description. */
  body_html?: string | null;
  html_url: string;
  state: "open" | "closed";
  draft: boolean;
  merged_at: string | null;
  head: { ref: string };
  base: { ref: string; repo: { full_name: string; private: boolean } };
  user: { login: string; avatar_url: string; html_url: string };
  additions: number;
  deletions: number;
  changed_files: number;
  comments: number;
  review_comments: number;
  updated_at: string;
  stack?: {
    id: number;
    number: number;
    position: number;
    size: number;
    base: { ref: string; sha: string };
  } | null;
};

// owner/repo arrive URL-decoded from route params and are interpolated into
// API paths and redirects, so only allow what GitHub itself allows.
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9._-]{1,100}$/;

function assertRepo(owner: string, repo: string) {
  if (!OWNER.test(owner) || !REPO.test(repo) || repo === "." || repo === "..") {
    throw new GitHubError(404, "Invalid repository");
  }
}

export function getStack(owner: string, repo: string, number: number) {
  assertRepo(owner, repo);
  return gh<Stack>(`/repos/${owner}/${repo}/stacks/${number}`);
}

export async function getPull(owner: string, repo: string, number: number) {
  assertRepo(owner, repo);
  // full+json adds body_html alongside the raw markdown body.
  const pr = await gh<PullRequest>(
    `/repos/${owner}/${repo}/pulls/${number}`,
    "application/vnd.github.full+json",
  );
  // Only public repos are supported. The token may be able to read private
  // ones, so don't rely on GitHub to hide them.
  if (pr.base.repo.private) throw new GitHubError(404, "Not found");
  return pr;
}
