"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Shared `prefers-reduced-motion` flag (reviewer round-3 non-blocking
 * suggestion for plan `memory/reviews/plans/a1e4a3b4026e7400.md`): a single
 * implementation used by both `VoiceFloatingIndicator` and `VoiceModeView`
 * so the two surfaces can never disagree. Returns `false` when `matchMedia`
 * is unavailable (SSR / non-browser environments), and stays live via the
 * media query's `change` event, cleaning up the listener on unmount.
 *
 * Always starts `false` and resolves the real value inside `useEffect` —
 * never a lazy `useState` initializer — so the client's first render matches
 * the server's markup exactly. `Splash` (this app's literal first screen)
 * reads this hook, and a lazy initializer would compute the real OS
 * preference synchronously on that very first client render, before
 * hydration even reconciles, mismatching the server's always-`false` markup.
 */
export default function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    setReduced(mql.matches);
    const handleChange = () => setReduced(mql.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
