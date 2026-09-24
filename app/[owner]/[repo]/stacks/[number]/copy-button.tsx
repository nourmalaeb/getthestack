"use client";

import { useRef, useState } from "react";

/**
 * Copies either the absolute URL for `href` (a path on this site) or the
 * text it serves.
 */
export function CopyButton({
  href,
  copy,
  children,
}: {
  href: string;
  copy: "url" | "content";
  children: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function onClick() {
    try {
      if (copy === "url") {
        await navigator.clipboard.writeText(new URL(href, location.origin).href);
      } else {
        await copyFetched(href);
      }
      setState("copied");
    } catch {
      // Clipboard API needs a secure context and permission; the fetch can
      // also fail (e.g. GitHub rate limit).
      setState("failed");
    }
    clearTimeout(reset.current);
    reset.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-secondary transition-colors hover:border-neutral-400 hover:text-foreground dark:border-neutral-800 dark:text-secondary dark:hover:border-neutral-600"
    >
      {/* aria-live so screen readers hear the result, not just the click. */}
      <span aria-live="polite">
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : children}
      </span>
    </button>
  );
}

async function copyFetched(href: string) {
  const text = fetch(href).then(async (res) => {
    if (!res.ok) throw new Error(`${res.status}`);
    return new Blob([await res.text()], { type: "text/plain" });
  });
  // Safari only allows a clipboard write after an await if it's handed the
  // pending data up front, inside the click.
  if (typeof ClipboardItem !== "undefined") {
    await navigator.clipboard.write([new ClipboardItem({ "text/plain": text })]);
  } else {
    await navigator.clipboard.writeText(await (await text).text());
  }
}
