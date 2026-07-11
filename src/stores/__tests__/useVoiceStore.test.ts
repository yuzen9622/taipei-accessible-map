import { beforeEach, describe, expect, it, vi } from "vitest";
import useVoiceStore, { type VoiceTranscriptEntry } from "../useVoiceStore";

function resetStore() {
  useVoiceStore.setState({
    status: { status: "idle" },
    transcripts: [],
    activeTool: null,
    viewMode: "panel",
    micLevel: 0,
    startSession: () => {},
    endSession: () => {},
    resumePlayback: () => {},
  });
}

describe("useVoiceStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("case 14a: setTranscripts mirrors entries including the sealed field", () => {
    const entries: VoiceTranscriptEntry[] = [
      { id: 0, role: "user", raw: "你好", text: "你好", sealed: true },
      { id: 1, role: "model", raw: "哈囉", text: "哈囉", sealed: false },
    ];
    useVoiceStore.getState().setTranscripts(entries);

    expect(useVoiceStore.getState().transcripts).toEqual(entries);
    expect(useVoiceStore.getState().transcripts[0].sealed).toBe(true);
    expect(useVoiceStore.getState().transcripts[1].sealed).toBe(false);
  });

  it("case 14b: setMicLevel reads and writes micLevel", () => {
    expect(useVoiceStore.getState().micLevel).toBe(0);
    useVoiceStore.getState().setMicLevel(0.42);
    expect(useVoiceStore.getState().micLevel).toBe(0.42);
  });

  it("case 14c: bindSessionActions binds real actions, callable afterward", () => {
    const start = vi.fn();
    const end = vi.fn();
    const resumePlayback = vi.fn();

    // Before binding, the default no-ops must not throw.
    expect(() => useVoiceStore.getState().startSession()).not.toThrow();

    useVoiceStore.getState().bindSessionActions({ start, end, resumePlayback });

    useVoiceStore.getState().startSession();
    useVoiceStore.getState().endSession();
    useVoiceStore.getState().resumePlayback();

    expect(start).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
    expect(resumePlayback).toHaveBeenCalledTimes(1);
  });
});
