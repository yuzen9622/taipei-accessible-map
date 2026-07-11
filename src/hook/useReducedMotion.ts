"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function readReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Shared `prefers-reduced-motion` flag (reviewer round-3 non-blocking
 * suggestion for plan `memory/reviews/plans/a1e4a3b4026e7400.md`): a single
 * implementation used by both `VoiceFloatingIndicator` and `VoiceModeView`
 * so the two surfaces can never disagree. Returns `false` when `matchMedia`
 * is unavailable (SSR / non-browser environments), and stays live via the
 * media query's `change` event, cleaning up the listener on unmount.
 */
export default function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const handleChange = () => setReduced(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
