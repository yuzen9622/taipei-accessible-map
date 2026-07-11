import { describe, expect, it, vi } from "vitest";
import {
  GAIN,
  isMicActiveStatus,
  recordingDotPresentation,
  rmsLevel,
  wrapFrameHandler,
} from "../audioLevel";
import type { VoiceStatusName } from "../voiceSession";

function buildInt16Buffer(samples: number[]): ArrayBuffer {
  const buf = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buf);
  samples.forEach((s, i) => {
    view.setInt16(i * 2, s, true);
  });
  return buf;
}

const ALL_STATUSES: VoiceStatusName[] = [
  "idle",
  "connecting",
  "ready",
  "listening",
  "model-speaking",
  "reconnecting",
  "playback-blocked",
  "needs-login",
  "ended",
  "error",
];

describe("audioLevel", () => {
  it("case 8a: an all-zero frame yields level 0", () => {
    const buf = buildInt16Buffer(new Array(64).fill(0));
    expect(rmsLevel(buf)).toBe(0);
  });

  it("case 8b: a full-scale square wave clamps to 1", () => {
    const samples: number[] = [];
    for (let i = 0; i < 64; i++) samples.push(i % 2 === 0 ? 32767 : -32768);
    const buf = buildInt16Buffer(samples);
    expect(rmsLevel(buf)).toBe(1);
  });

  it("case 9: a sine wave at amplitude 4096 matches clamp(amp/32768/sqrt2*GAIN) within 10%", () => {
    const amplitude = 4096;
    const cycles = 10;
    const samplesPerCycle = 80;
    const samples: number[] = [];
    for (let i = 0; i < cycles * samplesPerCycle; i++) {
      samples.push(
        Math.round(amplitude * Math.sin((2 * Math.PI * i) / samplesPerCycle)),
      );
    }
    const buf = buildInt16Buffer(samples);
    const expected = (amplitude / 32768 / Math.sqrt(2)) * GAIN;
    const actual = rmsLevel(buf);
    expect(actual).toBeGreaterThan(expected * 0.9);
    expect(actual).toBeLessThan(expected * 1.1);
  });

  it("case 10a: a 1-byte frame (less than one sample) never throws and returns 0", () => {
    const buf = new ArrayBuffer(1);
    expect(() => rmsLevel(buf)).not.toThrow();
    expect(rmsLevel(buf)).toBe(0);
  });

  it("case 10b: a 3-byte frame never throws and equals the truncated 1-sample reading", () => {
    const three = new ArrayBuffer(3);
    new DataView(three).setInt16(0, 12345, true);
    // third byte is arbitrary/unread
    new DataView(three).setUint8(2, 0xff);

    const two = buildInt16Buffer([12345]);

    expect(() => rmsLevel(three)).not.toThrow();
    expect(rmsLevel(three)).toBe(rmsLevel(two));
  });

  it("case 10c: an empty ArrayBuffer never throws and returns 0", () => {
    const buf = new ArrayBuffer(0);
    expect(() => rmsLevel(buf)).not.toThrow();
    expect(rmsLevel(buf)).toBe(0);
  });

  it("case 10d: a detached ArrayBuffer never throws and returns 0 (rev5 round4-F2)", () => {
    if (typeof structuredClone !== "function") {
      // Runtime has no structuredClone-based transfer; nothing to exercise.
      return;
    }
    const ab = buildInt16Buffer([1000, -1000, 2000]);
    structuredClone(ab, { transfer: [ab] });
    expect(ab.byteLength).toBe(0);
    expect(() => rmsLevel(ab)).not.toThrow();
    expect(rmsLevel(ab)).toBe(0);
  });

  it("case 11: wrapFrameHandler forwards the exact same ArrayBuffer reference, level reported before forward, forward called once", () => {
    const order: string[] = [];
    const frame = buildInt16Buffer([1000, -1000, 2000]);
    let forwarded: ArrayBuffer | null = null;
    const forward = vi.fn((f: ArrayBuffer) => {
      order.push("forward");
      forwarded = f;
    });
    const onLevel = vi.fn(() => order.push("level"));

    const handler = wrapFrameHandler(forward, onLevel);
    handler(frame);

    expect(onLevel).toHaveBeenCalledTimes(1);
    expect(forward).toHaveBeenCalledTimes(1);
    expect(order).toEqual(["level", "forward"]);
    expect(forwarded).toBe(frame);
  });

  it("case 12: isMicActiveStatus is true only for listening/model-speaking across the full status matrix", () => {
    for (const status of ALL_STATUSES) {
      const expected = status === "listening" || status === "model-speaking";
      expect(isMicActiveStatus(status), status).toBe(expected);
    }
  });

  it("case 13a: pulse is false for every VoiceStatusName x reducedMotion combination (animate-ping is gone, rev4)", () => {
    for (const status of ALL_STATUSES) {
      for (const reducedMotion of [true, false]) {
        for (const micLevel of [0, 0.5, 0.9, 1]) {
          expect(
            recordingDotPresentation(micLevel, status, reducedMotion).pulse,
            `${status}/${reducedMotion}/${micLevel}`,
          ).toBe(false);
        }
      }
    }
  });

  it("case 13b: reducedMotion always yields scale 1 regardless of micLevel/status", () => {
    for (const status of ALL_STATUSES) {
      expect(recordingDotPresentation(0.9, status, true)).toEqual({
        scale: 1,
        pulse: false,
      });
      expect(recordingDotPresentation(0, status, true)).toEqual({
        scale: 1,
        pulse: false,
      });
    }
  });

  it("case 13c: listening and model-speaking scale with micLevel, quiet is fully still", () => {
    for (const status of ["listening", "model-speaking"] as const) {
      expect(recordingDotPresentation(0.5, status, false)).toEqual({
        scale: 1.3,
        pulse: false,
      });
      expect(recordingDotPresentation(0, status, false)).toEqual({
        scale: 1,
        pulse: false,
      });
    }
  });

  it("case 13d: every other status is a static baseline (scale 1) — connecting/reconnecting/playback-blocked/ended/error/needs-login/idle/ready", () => {
    const inactiveStatuses: VoiceStatusName[] = [
      "idle",
      "connecting",
      "ready",
      "reconnecting",
      "playback-blocked",
      "needs-login",
      "ended",
      "error",
    ];
    for (const status of inactiveStatuses) {
      const result = recordingDotPresentation(0.8, status, false);
      expect(result, status).toEqual({ scale: 1, pulse: false });
    }
  });

  it("case 13e: out-of-range micLevel is clamped to [0,1]; non-finite is treated as 0", () => {
    for (const status of ["listening", "model-speaking"] as const) {
      expect(recordingDotPresentation(Number.NaN, status, false)).toEqual({
        scale: 1,
        pulse: false,
      });
      expect(recordingDotPresentation(-1, status, false)).toEqual({
        scale: 1,
        pulse: false,
      });
      expect(recordingDotPresentation(5, status, false)).toEqual({
        scale: 1.6,
        pulse: false,
      });
    }
  });
});
