import "server-only";
import { GitHubError, getPull, getStack, type PullRequest } from "@/lib/github";

/** Loads a stack and its pull requests, ordered bottom (closest to base) to top. */
export async function loadStack(owner: string, repo: string, number: string) {
  const n = Number(number);
  if (!Number.isInteger(n) || n <= 0) {
    throw new GitHubError(404, "Invalid stack number");
  }

  const stack = await getStack(owner, repo, n);
  const pulls = await Promise.all(
    stack.pull_requests.map((pr) => getPull(owner, repo, pr.number)),
  );
  return { owner, repo, stack, pulls };
}

export type LoadedStack = Awaited<ReturnType<typeof loadStack>>;

export function pullStatus(pr: PullRequest) {
  if (pr.merged_at) return "merged";
  if (pr.state === "closed") return "closed";
  if (pr.draft) return "draft";
  return "open";
}

/**
 * Error response for the machine-readable stack routes, as plain text or as
 * JSON ({ error, retry_after? }) to match the route's content type.
 */
export function errorResponse(e: unknown, format: "text" | "json" = "text") {
  if (!(e instanceof GitHubError)) throw e;

  let status = 502;
  let message = e.message;
  const headers: Record<string, string> = {};
  if (e.status === 404) {
    status = 404;
    message = "Stack not found";
  } else if (e.retryAfter) {
    status = 503;
    message = `GitHub API rate limit exceeded. Try again in ${e.retryAfter} seconds.`;
    headers["Retry-After"] = String(e.retryAfter);
  }

  return format === "json"
    ? Response.json(
        { error: message, retry_after: e.retryAfter },
        { status, headers },
      )
    : new Response(`${message}\n`, { status, headers });
}
