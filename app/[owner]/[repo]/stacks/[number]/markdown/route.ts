import type { NextRequest } from "next/server";
import { stackToMarkdown } from "@/lib/markdown";
import { errorResponse, loadStack } from "@/lib/stack";

// Served at /{owner}/{repo}/stacks/{n}.md, and at the stack URL itself when
// the request prefers text/markdown (see rewrites in next.config.ts).
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/[owner]/[repo]/stacks/[number]/markdown">,
) {
  const { owner, repo, number } = await ctx.params;
  try {
    const markdown = stackToMarkdown(await loadStack(owner, repo, number));
    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        Vary: "Accept",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
