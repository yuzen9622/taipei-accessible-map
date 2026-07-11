/**
 * Pure, React-free transcript aggregation used by `voiceSessionBindings`
 * (plan `memory/reviews/plans/a1e4a3b4026e7400.md` §3.1/§3.3).
 *
 * The controller streams `transcript` events fragment-by-fragment; without
 * aggregation every fragment became its own chat bubble. This module merges
 * consecutive same-role, not-yet-sealed fragments into a single growing
 * entry, and "seals" an entry (freezing it so a later same-role fragment
 * starts a new bubble instead of re-joining it) exactly at the status
 * transitions that mark a turn boundary.
 */

import type { VoiceStatusName } from "./voiceSession";

export type TranscriptRole = "user" | "model";

export interface AggEntry {
  id: number;
  role: TranscriptRole;
  /**
   * Raw, lossless concatenation of every fragment merged into this entry
   * (plan rev5 §3.1): appended exactly as received, no trimming/normalizing.
   * Preserves fragment-boundary whitespace (e.g. a trailing space from
   * "Hello ") so a later fragment can still form a correct word/character
   * boundary against it.
   */
  raw: string;
  /** Display value, re-derived from `raw` on every append: `normalizeCjkSpacing(raw).trim()`. */
  text: string;
  sealed: boolean;
}

export interface AggState {
  entries: AggEntry[];
  nextId: number;
}

export interface TranscriptFragment {
  role: TranscriptRole;
  text: string;
}

export function emptyAggState(): AggState {
  return { entries: [], nextId: 0 };
}

/**
 * CJK characters, including full-width punctuation (　-〿, ＀-￯) and CJK
 * Unified Ideographs (一-鿿).
 */
const CJK_CHAR_CLASS = "　-〿＀-￯一-鿿";
const CJK_INTERNAL_SPACE_RE = new RegExp(
  `([${CJK_CHAR_CLASS}])\\s+(?=[${CJK_CHAR_CLASS}])`,
  "g",
);

/**
 * Removes whitespace (including runs of consecutive whitespace) sitting
 * between two CJK characters — Gemini's streamed fragments sometimes carry
 * a stray space at a CJK/CJK boundary that a human reader would never see
 * there. Whitespace between two Latin/number characters, and whitespace at
 * a CJK–Latin boundary, is left untouched ("Hello world", "去 Taipei 101
 * 吧" are unaffected).
 */
export function normalizeCjkSpacing(text: string): string {
  return text.replace(CJK_INTERNAL_SPACE_RE, "$1");
}

/**
 * Merge `f` into the last entry when it shares the same role and that
 * entry is not yet sealed; otherwise start a new, unsealed entry.
 *
 * Lossless raw/display split (plan rev5 §3.1): `raw` accumulates every
 * fragment verbatim (untrimmed) so no character — including boundary
 * whitespace between fragments — is ever discarded. `text`, the display
 * value, is re-derived from the full `raw` on every append via
 * `normalizeCjkSpacing(raw).trim()`, so CJK-internal fragment spacing never
 * shows up in the UI while a trailing Latin-word space in `raw` (e.g.
 * "Hello ") still naturally joins the next fragment into "Hello world".
 *
 * When there is no unsealed same-role entry to extend, a fragment that is
 * empty/whitespace-only is ignored outright (no empty bubble is created);
 * otherwise a new entry is started with `raw = f.text`.
 */
export function appendFragment(s: AggState, f: TranscriptFragment): AggState {
  const last = s.entries[s.entries.length - 1];
  if (last && last.role === f.role && !last.sealed) {
    const raw = last.raw + f.text;
    const merged: AggEntry = {
      ...last,
      raw,
      text: normalizeCjkSpacing(raw).trim(),
    };
    return {
      entries: [...s.entries.slice(0, -1), merged],
      nextId: s.nextId,
    };
  }

  if (f.text.trim() === "") return s;

  const entry: AggEntry = {
    id: s.nextId,
    role: f.role,
    raw: f.text,
    text: normalizeCjkSpacing(f.text).trim(),
    sealed: false,
  };
  return {
    entries: [...s.entries, entry],
    nextId: s.nextId + 1,
  };
}

/**
 * Seal the last entry if it matches `role` and isn't already sealed.
 * Idempotent: no matching/unsealed last entry means the state is returned
 * unchanged.
 */
export function sealRole(s: AggState, role: TranscriptRole): AggState {
  const last = s.entries[s.entries.length - 1];
  if (!last || last.role !== role || last.sealed) return s;

  const sealed: AggEntry = { ...last, sealed: true };
  return {
    entries: [...s.entries.slice(0, -1), sealed],
    nextId: s.nextId,
  };
}

/**
 * Seal the turn that just ended on a status transition. Entering
 * `model-speaking` seals the trailing user entry; leaving `model-speaking`
 * (turn.complete, barge-in `interrupted`, reconnect, or a terminal status)
 * seals the trailing model entry.
 */
export function applyStatusTransition(
  s: AggState,
  prev: VoiceStatusName,
  next: VoiceStatusName,
): AggState {
  if (prev !== "model-speaking" && next === "model-speaking") {
    return sealRole(s, "user");
  }
  if (prev === "model-speaking" && next !== "model-speaking") {
    return sealRole(s, "model");
  }
  return s;
}
