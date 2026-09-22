# getthestack

Shareable pages for GitHub [stacked pull requests](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs).
GitHub gives stacks a number but no web URL; this renders one.

## URLs

| Path | What it does |
| --- | --- |
| `/{owner}/{repo}/stacks/{n}` | The stack page |
| `/{owner}/{repo}/pull/{n}` | Redirects to the stack that PR belongs to. You can swap `github.com` for this site in a PR link |
| `/go?q=…` | Accepts a pasted PR/stack URL or `owner/repo#123` |

## Development

```bash
cp .env.example .env.local   # add a GITHUB_TOKEN (e.g. `gh auth token`)
pnpm install
pnpm dev
```

Without a token you get GitHub's unauthenticated limit of 60 requests/hour.
A stack page costs 1 + (number of PRs) requests, cached for 60s. Only public
repos are supported for now.
