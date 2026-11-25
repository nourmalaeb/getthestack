import "server-only";
import { compareLines, GitHubError, getPull, getStack, type PullRequest } from "@/lib/github";

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

/**
 * Lines changed by the whole stack: one diff from just before the bottom pull
 * request to the top one. Falls back to the sum of the pull requests, where a
 * line changed in two of them counts twice, when that diff isn't available.
 */
export async function stackLines({ owner, repo, stack, pulls }: LoadedStack) {
  const sum = {
    additions: pulls.reduce((n, p) => n + p.additions, 0),
    deletions: pulls.reduce((n, p) => n + p.deletions, 0),
    exact: false,
  };
  const bottom = pulls.at(0);
  const top = pulls.at(-1);
  if (!bottom || !top) return sum;

  // Once merged, a pull request's changes are in its merge commit; its branch
  // may never have been an ancestor of the base.
  const start = bottom.merged_at
    ? `${bottom.merge_commit_sha}^`
    : stack.base.ref;
  const end = (top.merged_at && top.merge_commit_sha) || top.head.sha;

  try {
    const net = await compareLines(owner, repo, start, end);
    // A net diff can't exceed the sum. If it does, unrelated work landed on the
    // base branch between this stack's merges and is in the diff too.
    if (
      net &&
      net.additions <= sum.additions &&
      net.deletions <= sum.deletions
    ) {
      return { ...net, exact: true };
    }
  } catch (e) {
    // E.g. the base branch is gone. Not worth failing the page over.
    if (!(e instanceof GitHubError)) throw e;
  }
  return sum;
}

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
