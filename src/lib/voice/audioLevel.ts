/**
 * Pure, React-free microphone level + recording-dot presentation helpers
 * (plan `memory/reviews/plans/a1e4a3b4026e7400.md` §3.2, plus the reviewer's
 * non-blocking round-3 suggestions folded in as deterministic requirements:
 * `recordingDotPresentation` returns a defined `{ scale, pulse }` for every
 * `VoiceStatusName`, not just the mic-active ones).
 */

import type { VoiceStatusName } from "./voiceSession";

/** General speech lands around 0.3–0.8 after this gain. */
export const GAIN = 4;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * RMS level of a PCM16 frame, normalized to [0, 1]. Never throws:
 * fewer than one full sample (0 or 1 byte) returns 0; an odd trailing byte
 * is dropped (only the whole 16-bit samples are read). Samples are read
 * with the platform's native endianness, matching the same-browser capture
 * worklet that produced the frame. The whole computation is wrapped in a
 * try/catch (plan rev5 round4-F2): a detached `ArrayBuffer` (or any other
 * typed-array construction/computation failure) returns 0 rather than
 * throwing, since a bad frame must never break capture-frame forwarding.
 */
export function rmsLevel(frame: ArrayBuffer): number {
  try {
    const sampleCount = Math.floor(frame.byteLength / 2);
    if (sampleCount < 1) return 0;

    const samples = new Int16Array(frame, 0, sampleCount);
    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      sumSquares += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSquares / samples.length);
    return clamp((rms / 32768) * GAIN, 0, 1);
  } catch {
    return 0;
  }
}

/**
 * Wraps a capture frame handler: reports the frame's level via `onLevel`
 * before forwarding the exact same `ArrayBuffer` reference to `forward`
 * (never copied or mutated).
 */
export function wrapFrameHandler(
  forward: (frame: ArrayBuffer) => void,
  onLevel: (level: number) => void,
): (frame: ArrayBuffer) => void {
  return (frame: ArrayBuffer) => {
    onLevel(rmsLevel(frame));
    forward(frame);
  };
}

/** The only statuses in which the microphone is actively capturing. */
export function isMicActiveStatus(status: VoiceStatusName): boolean {
  return status === "listening" || status === "model-speaking";
}

export interface RecordingDotPresentation {
  scale: number;
  pulse: boolean;
}

/**
 * Deterministic presentation for the recording dot, for every
 * `VoiceStatusName` (plan rev4/rev5 §3.2: the dot is idle-still at rest,
 * moving only with speech):
 * - `pulse` is always `false` — the persistent `animate-ping` ring is
 *   gone; the dot's only motion is level-driven scale. The field is kept
 *   in the return type for source compatibility.
 * - reduced motion: always static (`scale: 1`), regardless of mic level
 *   or status.
 * - mic-active statuses (`listening`, `model-speaking`, which includes
 *   barge-in — the mic keeps capturing while the model is still speaking):
 *   scale grows with `micLevel`, clamped to [0, 1] first (a non-finite
 *   value — e.g. `NaN` — is treated as 0) so a caller passing an
 *   out-of-contract value can never produce a negative or runaway scale.
 * - every other status (`idle`, `connecting`, `ready`, `reconnecting`,
 *   `playback-blocked`, `needs-login`, `ended`, `error`): static baseline.
 */
export function recordingDotPresentation(
  micLevel: number,
  statusName: VoiceStatusName,
  reducedMotion: boolean,
): RecordingDotPresentation {
  if (reducedMotion) return { scale: 1, pulse: false };
  if (isMicActiveStatus(statusName)) {
    const level = Number.isFinite(micLevel) ? clamp(micLevel, 0, 1) : 0;
    return { scale: 1 + level * 0.6, pulse: false };
  }
  return { scale: 1, pulse: false };
}
