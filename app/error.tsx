"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-neutral-500">{error.message}</p>
    </main>
  );
}
