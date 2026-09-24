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

/** Plain-text error response for the machine-readable stack routes. */
export function errorResponse(e: unknown) {
  if (e instanceof GitHubError) {
    if (e.status === 404) return new Response("Stack not found\n", { status: 404 });
    if (e.retryAfter) {
      return new Response(
        `GitHub API rate limit exceeded. Try again in ${e.retryAfter} seconds.\n`,
        { status: 503, headers: { "Retry-After": String(e.retryAfter) } },
      );
    }
  }
  throw e;
}
