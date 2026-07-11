"use client";

import { useEffect, useState } from "react";

// Matches Tailwind's `lg` breakpoint (1024px) so `aria-hidden`/`inert` on the
// desktop vs. mobile control trees always agrees with which one is actually
// visible via `hidden lg:flex` / `lg:hidden` CSS.
const QUERY = "(min-width: 1024px)";

function readIsDesktop(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Tracks the `lg` breakpoint so components that render two CSS-toggled
 * control trees (one for mobile, one for desktop) can mark the currently
 * invisible one `aria-hidden` + `inert`. This keeps focus and screen-reader
 * navigation confined to the single visually-active tree even though both
 * remain mounted for layout/animation continuity.
 */
export default function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(readIsDesktop);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const handleChange = () => setIsDesktop(mql.matches);
    handleChange();
    // `change` covers real orientation/breakpoint crossings; `resize` is a
    // belt-and-suspenders fallback for environments (embedded webviews,
    // some automated viewport tools) that resize without firing a
    // MediaQueryList change event.
    mql.addEventListener("change", handleChange);
    window.addEventListener("resize", handleChange);
    return () => {
      mql.removeEventListener("change", handleChange);
      window.removeEventListener("resize", handleChange);
    };
  }, []);

  return isDesktop;
}
