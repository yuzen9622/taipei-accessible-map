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
   * (plan rev5 §3.1), or the verbatim sentence from a `final: true` /
   * `transcript.correction` event. Appended or replaced exactly as received,
   * no trimming/normalizing.
   */
  raw: string;
  /** Display value, re-derived from `raw` on every update: `normalizeCjkSpacing(raw).trim()`. */
  text: string;
  sealed: boolean;
  /**
   * Server utterance id for `role: "user"` (e.g. "u1", "u2").
   * Shared by interim, final, and transcript.correction events for the same utterance.
   */
  utteranceId?: string;
}

export interface AggState {
  entries: AggEntry[];
  nextId: number;
}

export interface TranscriptFragment {
  role: TranscriptRole;
  text: string;
  final?: boolean;
  utteranceId?: string;
}

export interface TranscriptCorrection {
  role?: "user";
  text: string;
  utteranceId: string;
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
 * Merge `f` into an existing bubble or start a new bubble.
 *
 * For `role: "user"`:
 * - If `f.utteranceId` is provided, find the matching user entry.
 * - Otherwise (or if not found), check if the last entry is an unsealed user entry.
 * - If matching entry found:
 *     - `if (f.final === true)`: replace `raw` with `f.text`, derive `text`, and mark `sealed: true` (this utterance is complete).
 *     - `else`: append `f.text` to `raw` and derive `text`.
 * - If no matching entry found:
 *     - Ignore empty/whitespace-only fragments.
 *     - Create a new entry (marked `sealed: true` if `f.final === true`, else unsealed).
 *
 * For `role: "model"`:
 * - Model fragments stream sequentially without `final` / `utteranceId`.
 * - If the last entry is model and unsealed, append `f.text` to `raw`.
 * - Otherwise create a new unsealed model entry.
 * - Model entries are sealed by `turn.complete`, `interrupted`, or leaving `model-speaking`.
 */
function appendUserFragment(s: AggState, f: TranscriptFragment): AggState {
  let targetIdx = -1;
  if (f.utteranceId) {
    targetIdx = s.entries.findIndex(
      (e) => e.role === "user" && e.utteranceId === f.utteranceId,
    );
  }

  if (targetIdx === -1) {
    const lastIdx = s.entries.length - 1;
    if (
      lastIdx >= 0 &&
      s.entries[lastIdx].role === "user" &&
      !s.entries[lastIdx].sealed &&
      (!s.entries[lastIdx].utteranceId ||
        s.entries[lastIdx].utteranceId === f.utteranceId)
    ) {
      targetIdx = lastIdx;
    }
  }

  if (targetIdx !== -1) {
    const existing = s.entries[targetIdx];
    const isFinal = f.final === true;
    const raw = isFinal ? f.text : existing.raw + f.text;
    const updated: AggEntry = {
      ...existing,
      raw,
      text: normalizeCjkSpacing(raw).trim(),
      sealed: isFinal ? true : existing.sealed,
      utteranceId: f.utteranceId ?? existing.utteranceId,
    };
    const entries = [...s.entries];
    entries[targetIdx] = updated;
    return { entries, nextId: s.nextId };
  }

  if (f.text.trim() === "") return s;

  const entry: AggEntry = {
    id: s.nextId,
    role: "user",
    raw: f.text,
    text: normalizeCjkSpacing(f.text).trim(),
    sealed: f.final === true,
    utteranceId: f.utteranceId,
  };
  return {
    entries: [...s.entries, entry],
    nextId: s.nextId + 1,
  };
}

function appendModelFragment(s: AggState, f: TranscriptFragment): AggState {
  const last = s.entries.at(-1);
  if (last && last.role === "model" && !last.sealed) {
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
    role: "model",
    raw: f.text,
    text: normalizeCjkSpacing(f.text).trim(),
    sealed: false,
  };
  return {
    entries: [...s.entries, entry],
    nextId: s.nextId + 1,
  };
}

export function appendFragment(s: AggState, f: TranscriptFragment): AggState {
  return f.role === "user"
    ? appendUserFragment(s, f)
    : appendModelFragment(s, f);
}

/**
 * Replace the rendered text of an existing user utterance with the corrected text
 * using `utteranceId` as the key.
 *
 * If no matching user entry is found with `utteranceId`, state is returned unchanged.
 */
export function applyCorrection(
  s: AggState,
  correction: TranscriptCorrection,
): AggState {
  if (!correction.utteranceId) return s;
  const idx = s.entries.findIndex(
    (e) => e.role === "user" && e.utteranceId === correction.utteranceId,
  );
  if (idx === -1) return s;

  const existing = s.entries[idx];
  const raw = correction.text;
  const updated: AggEntry = {
    ...existing,
    raw,
    text: normalizeCjkSpacing(raw).trim(),
  };
  const entries = [...s.entries];
  entries[idx] = updated;
  return {
    entries,
    nextId: s.nextId,
  };
}

/**
 * Seal any unsealed entries matching `role`.
 * Idempotent: no unsealed entry matching `role` means the state is returned unchanged.
 */
export function sealRole(s: AggState, role: TranscriptRole): AggState {
  let changed = false;
  const entries = s.entries.map((entry) => {
    if (entry.role === role && !entry.sealed) {
      changed = true;
      return { ...entry, sealed: true };
    }
    return entry;
  });
  if (!changed) return s;
  return {
    entries,
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
