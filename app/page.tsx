export default async function Home(props: PageProps<"/">) {
  const { error } = await props.searchParams;

  return (
    <main className="mx-auto flex w-full min-h-full flex-col grow justify-center">
      <h1 className="text-3xl font-semibold">Get the stack</h1>
      <p className="mt-2 text-secondary">
        Shareable links for GitHub stacked pull requests. Paste any PR in a stack, or swap{" "}
        <code className="font-mono">github.com</code> for this site in a PR URL.
      </p>

      <form action="/go" className="mt-8 flex gap-2">
        <input
          name="q"
          required
          autoFocus
          placeholder="https://github.com/owner/repo/pull/123"
          defaultValue={typeof error === "string" ? error : undefined}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-3 py-2 font-mono text-sm outline-none focus:border-neutral-500 dark:border-neutral-700"
        />
        <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background">
          Go
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t read that. Try a PR URL or <code>owner/repo#123</code>.
        </p>
      )}
    </main>
  );
}
