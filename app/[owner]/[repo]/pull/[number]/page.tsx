import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GitHubError, getPull } from "@/lib/github";

// Mirrors github.com/{owner}/{repo}/pull/{n}: swap the domain on a PR link
// and land on the stack that PR belongs to.
export default async function PullRedirect(
  props: PageProps<"/[owner]/[repo]/pull/[number]">,
) {
  const { owner, repo, number } = await props.params;
  const n = Number(number);
  if (!Number.isInteger(n) || n <= 0) notFound();

  let pr;
  try {
    pr = await getPull(owner, repo, n);
  } catch (e) {
    if (e instanceof GitHubError && e.status === 404) notFound();
    throw e;
  }

  if (pr.stack) redirect(`/${owner}/${repo}/stacks/${pr.stack.number}`);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Not part of a stack</h1>
      <p className="mt-2 text-neutral-500">
        <a href={pr.html_url} className="underline">
          {owner}/{repo}#{pr.number}
        </a>{" "}
        isn&apos;t in a stack.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm underline">
        Try another pull request
      </Link>
    </main>
  );
}
