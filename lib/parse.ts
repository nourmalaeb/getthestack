/**
 * Turns whatever the user pasted into a path on this site. Accepts:
 *   https://github.com/o/r/pull/123[/files…]   o/r/pull/123
 *   https://github.com/o/r/stacks/123          o/r/stacks/123
 *   o/r#123  (treated as a PR)
 */
export function parseTarget(input: string): string | null {
  const s = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?github\.com\//, "");

  const path = s.match(/^([\w.-]+)\/([\w.-]+)\/(pull|stacks)\/(\d+)/);
  if (path) {
    const [, owner, repo, kind, n] = path;
    return `/${owner}/${repo}/${kind}/${n}`;
  }

  const short = s.match(/^([\w.-]+)\/([\w.-]+)#(\d+)$/);
  if (short) {
    const [, owner, repo, n] = short;
    return `/${owner}/${repo}/pull/${n}`;
  }

  return null;
}
