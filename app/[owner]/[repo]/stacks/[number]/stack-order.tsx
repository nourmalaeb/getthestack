"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { STACK_ORDER_KEY, type StackOrder } from "@/lib/stack-order";

// Held in memory too, so reversing still works when storage is unavailable.
let current: StackOrder | undefined;
const listeners = new Set<() => void>();

function read(): StackOrder {
  if (current === undefined) {
    try {
      current =
        localStorage.getItem(STACK_ORDER_KEY) === "bottom-up"
          ? "bottom-up"
          : "top-down";
    } catch {
      current = "top-down";
    }
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Follow changes made in other tabs.
  function onStorage(e: StorageEvent) {
    if (e.key !== STACK_ORDER_KEY) return;
    current = e.newValue === "bottom-up" ? "bottom-up" : "top-down";
    applyToDocument(current);
    listener();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function applyToDocument(order: StackOrder) {
  document.documentElement.dataset.stackOrder = order;
}

function setStackOrder(order: StackOrder) {
  current = order;
  try {
    localStorage.setItem(STACK_ORDER_KEY, order);
  } catch {}
  applyToDocument(order);
  listeners.forEach((l) => l());
}

/**
 * The saved order. Hydration renders the server's top-down order; the saved
 * order takes over right after. Until then, CSS keyed on <html
 * data-stack-order> flips the list so it already looks right.
 */
function useStackOrder() {
  return useSyncExternalStore(subscribe, read, () => "top-down" as const);
}

export function ReverseButton() {
  return (
    <button
      type="button"
      onClick={() =>
        setStackOrder(read() === "top-down" ? "bottom-up" : "top-down")
      }
      className="shrink-0 rounded-md border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 transition-colors hover:border-neutral-400 hover:text-foreground dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600"
    >
      <span aria-hidden>⇅</span> Reverse order
    </button>
  );
}

/**
 * The pull request list plus the base branch line, in the saved order.
 * `items` and `base` arrive top of the stack first.
 */
export function StackList({
  items,
  base,
}: {
  items: React.ReactNode[];
  base: React.ReactNode;
}) {
  const order = useStackOrder();

  // Dev Strict Mode remounts reset <html> to its JSX attributes, dropping the
  // one the inline script set. A no-op in production.
  useLayoutEffect(() => applyToDocument(order), [order]);

  const topDown = order === "top-down";
  // In DOM order, so reading and tabbing follow what's on screen.
  // data-stack-dom tells globals.css which order the DOM is in.
  const list = (
    // reversed when top-down: the implicit numbering then counts down to 1
    // to match the positions shown. Markers stay hidden; adding them would
    // repeat each number. role="list" because WebKit drops list semantics
    // when list-style is none.
    <ol
      key="list"
      reversed={topDown}
      role="list"
      data-stack-dom={order}
      className="flex flex-col gap-3"
    >
      {topDown ? items : [...items].reverse()}
    </ol>
  );
  const baseLine = <div key="base">{base}</div>;

  return (
    <div data-stack-dom={order} className="flex flex-col gap-3">
      {topDown ? [list, baseLine] : [baseLine, list]}
    </div>
  );
}
