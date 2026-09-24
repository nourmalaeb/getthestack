/**
 * Which way stack pages list pull requests: top of the stack first (the
 * default) or bottom first. Saved in localStorage so every stack displays the
 * same way, and mirrored onto <html data-stack-order> so CSS can apply it
 * before React hydrates.
 */
export type StackOrder = "top-down" | "bottom-up";

export const STACK_ORDER_KEY = "stack-order";

/** Runs in <head> during parsing, so the first paint uses the saved order. */
export const stackOrderScript = `try{if(localStorage.getItem(${JSON.stringify(
  STACK_ORDER_KEY,
)})==="bottom-up")document.documentElement.dataset.stackOrder="bottom-up"}catch(e){}`;
