import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GitHubError, type PullRequest, type Stack } from "@/lib/github";
import { loadStack } from "@/lib/stack";
import { CopyButton } from "./copy-button";
import { ReverseButton, StackList } from "./stack-order";

type Props = PageProps<"/[owner]/[repo]/stacks/[number]">;

async function load(props: Props) {
  const { owner, repo, number } = await props.params;
  try {
    return await loadStack(owner, repo, number);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { owner, repo, stack, pulls } = await load(props);
  const title = `Stack #${stack.number} · ${owner}/${repo}`;
  return {
    title,
    description: `${pulls.length} pull requests into ${stack.base.ref}: ${pulls
      .map((p) => `#${p.number}`)
      .join(" → ")}`,
  };
}

export default async function StackPage(props: Props) {
  const { owner, repo, stack, pulls } = await load(props);
  const merged = pulls.filter((p) => p.merged_at).length;
  // Top of the stack first, so the base branch sits at the bottom. StackList
  // flips it if the reader prefers bottom first.
  const topDown = [...pulls].reverse();
  const markdownHref = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/stacks/${stack.number}.md`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      {/* React hoists this into <head>. Set here rather than in metadata
          alternates so the href stays relative without a metadataBase. */}
      <link
        rel="alternate"
        type="text/markdown"
        href={markdownHref}
      />
      <header className="mb-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <a
            href={`https://github.com/${owner}/${repo}`}
            className="text-sm text-neutral-500 hover:underline"
          >
            {owner}/{repo}
          </a>
          {/* For pasting into an LLM or agent. */}
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <a
              href={markdownHref}
              className="hover:text-foreground hover:underline"
            >
              Markdown
            </a>
            <CopyButton href={markdownHref} copy="url">
              Copy link
            </CopyButton>
            <CopyButton href={markdownHref} copy="content">
              Copy markdown
            </CopyButton>
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          Stack #{stack.number}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          <StackBadge stack={stack} /> · {pulls.length} pull requests ·{" "}
          {merged} merged · into{" "}
          <code className="font-mono">{stack.base.ref}</code>
        </p>
        <div className="mt-5 flex items-start justify-between gap-4 text-sm text-neutral-500">
          {/* Both versions render; CSS shows the one for the saved order, so
              it's right before hydration. */}
          <p aria-live="polite">
            <span className="bottom-up:hidden">
              <span className="font-medium">↓ Top of the stack first.</span>{" "}
              The bottom pull request merges into{" "}
              <code className="font-mono">{stack.base.ref}</code> first, and
              each one builds on the one below it.
            </span>
            <span className="hidden bottom-up:inline">
              <span className="font-medium">↑ Bottom of the stack first.</span>{" "}
              The first pull request merges into{" "}
              <code className="font-mono">{stack.base.ref}</code> first, and
              each one builds on the one above it.
            </span>
          </p>
          <ReverseButton />
        </div>
      </header>

      <StackList
        items={topDown.map((pr, i) => (
          <li key={pr.number}>
            <PullCard
              pr={pr}
              position={pulls.length - i}
              size={pulls.length}
            />
          </li>
        ))}
        base={
          // Same border, padding, and number column as PullCard, so the
          // glyph lines up with the positions and the branch with the titles.
          <div className="flex items-center gap-4 border border-transparent px-4 font-mono text-sm">
            <span aria-hidden className="w-6 shrink-0 text-right text-neutral-400">
              <span className="bottom-up:hidden">└</span>
              <span className="hidden bottom-up:inline">┌</span>
            </span>
            <span className="sr-only">Base branch:</span>
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              {stack.base.ref}
            </span>
          </div>
        }
      />
    </main>
  );
}

function StackBadge({ stack }: { stack: Stack }) {
  return stack.open ? (
    <span className="text-green-600 dark:text-green-400">Open</span>
  ) : (
    <span className="text-neutral-500">Closed</span>
  );
}

function PullCard({
  pr,
  position,
  size,
}: {
  pr: PullRequest;
  position: number;
  size: number;
}) {
  return (
    <div className="flex gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-sm text-neutral-400">
        <span aria-hidden>{position}</span>
        <span className="sr-only">
          {`Position ${position} of ${size}${
            size === 1
              ? " (only)"
              : position === 1
                ? " (bottom)"
                : position === size
                  ? " (top)"
                  : ""
          }`}
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-medium leading-snug">
            <a href={pr.html_url} className="hover:underline">
              {pr.title}
            </a>
          </h2>
          <PullStatus pr={pr} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
          <span>#{pr.number}</span>
          <span className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pr.user.avatar_url}
              alt=""
              width={16}
              height={16}
              className="rounded-full"
            />
            {pr.user.login}
          </span>
          <span className="font-mono">
            <span className="text-green-600 dark:text-green-400">
              +{pr.additions}
            </span>{" "}
            <span className="text-red-600 dark:text-red-400">
              −{pr.deletions}
            </span>
          </span>
          <span>{pr.changed_files} files</span>
          {pr.comments + pr.review_comments > 0 && (
            <span>{pr.comments + pr.review_comments} comments</span>
          )}
          <span className="ml-auto flex gap-1.5">
            <QuickLink href={pr.html_url}>Conversation</QuickLink>
            <QuickLink href={`${pr.html_url}/files`}>Files changed</QuickLink>
          </span>
        </div>

        {pr.body_html?.trim() && (
          <details className="group mt-3">
            <summary className="cursor-pointer list-none text-sm text-neutral-500 select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
              <span className="inline-block transition-transform group-open:rotate-90">
                ›
              </span>{" "}
              Description
            </summary>
            <div
              className="prose prose-sm prose-neutral dark:prose-invert mt-3 max-w-none border-l-2 border-neutral-200 pl-4 dark:border-neutral-800 [&_.task-list-item]:list-none [&_.task-list-item-checkbox]:mr-1.5"
              // Already sanitized by GitHub's markdown renderer.
              dangerouslySetInnerHTML={{ __html: pr.body_html }}
            />
          </details>
        )}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 transition-colors hover:border-neutral-400 hover:text-foreground dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600"
    >
      {children}
    </a>
  );
}

function PullStatus({ pr }: { pr: PullRequest }) {
  const [label, className] = pr.merged_at
    ? ["Merged", "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"]
    : pr.state === "closed"
      ? ["Closed", "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"]
      : pr.draft
        ? ["Draft", "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"]
        : ["Open", "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"];

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
