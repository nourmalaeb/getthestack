import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-neutral-500">
        No such stack or pull request. It may be in a private repo, which
        isn&apos;t supported yet. <Link href="/" className="underline">Try another</Link>.
      </p>
    </main>
  );
}
