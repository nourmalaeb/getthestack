import type { NextRequest } from "next/server";
import { errorResponse, loadStack, pullStatus } from "@/lib/stack";

// Served at /{owner}/{repo}/stacks/{n}.json (see rewrites in next.config.ts).
// A trimmed, stable shape rather than GitHub's raw responses.
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/[owner]/[repo]/stacks/[number]/json">,
) {
  const { owner, repo, number } = await ctx.params;
  try {
    const { stack, pulls } = await loadStack(owner, repo, number);
    return Response.json({
      owner,
      repo,
      number: stack.number,
      open: stack.open,
      base: stack.base.ref,
      created_at: stack.created_at,
      // Bottom of the stack (merges first) to top.
      pull_requests: pulls.map((pr, i) => ({
        position: i + 1,
        number: pr.number,
        title: pr.title,
        status: pullStatus(pr),
        author: pr.user.login,
        head: pr.head.ref,
        base: pr.base.ref,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files,
        comments: pr.comments + pr.review_comments,
        updated_at: pr.updated_at,
        url: pr.html_url,
        body: pr.body ?? null,
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
