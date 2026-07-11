"use client";

import { useSyncExternalStore } from "react";

// Matches Tailwind's `lg` breakpoint (1024px) so `aria-hidden`/`inert` on the
// desktop vs. mobile control trees always agrees with which one is actually
// visible via `hidden lg:flex` / `lg:hidden` CSS.
const QUERY = "(min-width: 1024px)";

function subscribe(onStoreChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onStoreChange);
  // Fallback for environments (embedded webviews, automated viewport tools)
  // that resize without firing a MediaQueryList change event.
  window.addEventListener("resize", onStoreChange);
  return () => {
    mql.removeEventListener("change", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
  };
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

// Server snapshot is always `false` (mobile-first): SSR HTML and the client's
// first hydration frame agree, so React never sees an aria-hidden/inert
// mismatch. The correct value lands in the post-hydration render, and CSS
// (`hidden lg:*`) keeps the visuals right during that first frame.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks the `lg` breakpoint so components that render two CSS-toggled
 * control trees (one for mobile, one for desktop) can mark the currently
 * invisible one `aria-hidden` + `inert`. This keeps focus and screen-reader
 * navigation confined to the single visually-active tree even though both
 * remain mounted for layout/animation continuity.
 */
export default function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
