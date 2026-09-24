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
    `${stack.open ? "Open" : "Closed"} · ${count(pulls.length, "pull request")} · ${merged} merged · into ${code(stack.base.ref)}`,
    "",
    `Repository: https://github.com/${owner}/${repo}`,
    "",
    `Pull requests are listed bottom to top, in merge order. The first targets ${code(stack.base.ref)}, and each later one builds on the one before it.`,
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
    `- Position: ${position} of ${size}${edgeLabel(position, size)}`,
    `- Status: ${STATUS_LABEL[pullStatus(pr)]}`,
    `- Author: @${pr.user.login}`,
    `- Branch: ${code(pr.head.ref)} → ${code(pr.base.ref)}`,
    `- Changes: +${pr.additions} −${pr.deletions} across ${count(pr.changed_files, "file")}`,
    `- Comments: ${comments}`,
    `- Conversation: ${pr.html_url}`,
    `- Files changed: ${pr.html_url}/files`,
  ];

  const body = pr.body?.replace(/\r\n?/g, "\n").trim();
  const description = body && containDescription(body, 3).trim();
  if (description) lines.push("", "### Description", "", description);
  return lines;
}

function edgeLabel(position: number, size: number) {
  if (size === 1) return " (only)";
  if (position === 1) return " (bottom)";
  if (position === size) return " (top)";
  return "";
}

function count(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/** Inline code that survives backticks in the text (e.g. a branch name). */
function code(text: string) {
  const runs = text.match(/`+/g) ?? [];
  const ticks = "`".repeat(Math.max(0, ...runs.map((r) => r.length)) + 1);
  const pad = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${ticks}${pad}${text}${pad}${ticks}`;
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
// Lines that can't be the text of a setext heading: blank, indented code, or
// the start of another block (heading, quote, list item, fence).
const NOT_PARAGRAPH =
  /^(\s*$| {4}|\t| {0,3}(#|>|[-*+][ \t]|\d{1,9}[.)][ \t]|`{3}|~{3}))/;

/**
 * Keeps a PR description from breaking the document around it: pushes its
 * headings (ATX and setext) below ours, drops HTML comments the rendered page
 * would hide, and closes a code fence left open. Fenced code is left alone.
 */
function containDescription(markdown: string, by: number) {
  const out: string[] = [];
  let fence: string | null = null;
  let inComment = false;

  for (const raw of markdown.split("\n")) {
    if (fence) {
      const close = raw.match(FENCE);
      if (
        close &&
        close[1][0] === fence[0] &&
        close[1].length >= fence.length &&
        raw.trim() === close[1]
      ) {
        fence = null;
      }
      out.push(raw);
      continue;
    }

    let line;
    [line, inComment] = stripComments(raw, inComment);
    // Drop lines that held nothing but a comment.
    if (line !== raw && !line.trim()) continue;

    const open = line.match(FENCE);
    if (open) {
      fence = open[1];
      out.push(line);
      continue;
    }

    const underline = line.match(SETEXT_UNDERLINE);
    const prev = out.at(-1);
    if (underline && prev !== undefined && !NOT_PARAGRAPH.test(prev)) {
      const level = underline[1][0] === "=" ? 1 : 2;
      out[out.length - 1] = `${"#".repeat(level + by)} ${prev.trim()}`;
      continue;
    }

    out.push(
      line.replace(/^( {0,3})(#{1,6})(?=\s|$)/, (_, indent, hashes) =>
        indent + "#".repeat(Math.min(6, hashes.length + by)),
      ),
    );
  }

  if (fence) out.push(fence);
  return out.join("\n");
}

/**
 * Removes <!-- … --> from a line, carrying an unclosed comment over to the
 * next. Like GitHub's renderer, an unclosed comment hides everything after it.
 */
function stripComments(line: string, inComment: boolean): [string, boolean] {
  let rest = line;
  let kept = "";
  while (rest) {
    if (inComment) {
      const end = rest.indexOf("-->");
      if (end === -1) return [kept, true];
      rest = rest.slice(end + 3);
      inComment = false;
    } else {
      const start = rest.indexOf("<!--");
      if (start === -1) return [kept + rest, false];
      kept += rest.slice(0, start);
      rest = rest.slice(start + 4);
      inComment = true;
    }
  }
  return [kept, inComment];
}
