"use client";

import { useRef, useState } from "react";

/** Copies the absolute URL for `href` (a path on this site). */
export function CopyLink({ href, label }: { href: string; label: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const reset = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(href, location.origin).href);
      setState("copied");
    } catch {
      // Clipboard API needs a secure context and permission.
      setState("failed");
    }
    clearTimeout(reset.current);
    reset.current = setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 transition-colors hover:border-neutral-400 hover:text-foreground dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600"
    >
      {/* aria-live so screen readers hear the result, not just the click. */}
      <span aria-live="polite">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Copy failed"
            : "Copy"}
      </span>
    </button>
  );
}
