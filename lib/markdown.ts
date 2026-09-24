import type { PullRequest } from "@/lib/github";
import { pullStatus, type LoadedStack } from "@/lib/stack";

const STATUS_LABEL = {
  merged: "Merged",
  closed: "Closed",
  draft: "Draft",
  open: "Open",
} as const;

/**
 * The stack as a single Markdown document, for LLMs and agents. Pull requests
 * run bottom to top, the order they merge in.
 */
export function stackToMarkdown({ owner, repo, stack, pulls }: LoadedStack) {
  const merged = pulls.filter((p) => p.merged_at).length;
  const lines = [
    `# Stack #${stack.number} · ${owner}/${repo}`,
    "",
    `${stack.open ? "Open" : "Closed"} · ${pulls.length} pull requests · ${merged} merged · into \`${stack.base.ref}\``,
    "",
    `Repository: https://github.com/${owner}/${repo}`,
    "",
    `Pull requests are listed bottom to top, in merge order. The first targets \`${stack.base.ref}\`, and each later one builds on the one before it.`,
  ];

  pulls.forEach((pr, i) => {
    lines.push("", ...pullToMarkdown(pr, i + 1, pulls.length));
  });

  return lines.join("\n") + "\n";
}

function pullToMarkdown(pr: PullRequest, position: number, size: number) {
  const comments = pr.comments + pr.review_comments;
  const lines = [
    `## ${position}. ${pr.title} (#${pr.number})`,
    "",
    `- Position: ${position} of ${size}${position === 1 ? " (bottom)" : position === size ? " (top)" : ""}`,
    `- Status: ${STATUS_LABEL[pullStatus(pr)]}`,
    `- Author: @${pr.user.login}`,
    `- Branch: \`${pr.head.ref}\` → \`${pr.base.ref}\``,
    `- Changes: +${pr.additions} −${pr.deletions} across ${pr.changed_files} files`,
    `- Comments: ${comments}`,
    `- Conversation: ${pr.html_url}`,
    `- Files changed: ${pr.html_url}/files`,
  ];

  const body = pr.body?.replace(/\r\n?/g, "\n").trim();
  if (body) lines.push("", "### Description", "", demoteHeadings(body, 3));
  return lines;
}

/**
 * Pushes the description's own headings below ours so they can't break the
 * document outline. Leaves fenced code blocks alone.
 */
function demoteHeadings(markdown: string, by: number) {
  let fence: string | null = null;
  return markdown
    .split("\n")
    .map((line) => {
      const open = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (open) {
        if (!fence) fence = open[1];
        else if (open[1][0] === fence[0] && open[1].length >= fence.length) {
          fence = null;
        }
        return line;
      }
      if (fence) return line;
      return line.replace(/^( {0,3})(#{1,6})(?=\s|$)/, (_, indent, hashes) =>
        indent + "#".repeat(Math.min(6, hashes.length + by)),
      );
    })
    .join("\n");
}
