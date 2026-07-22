import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AggEntry } from "../transcriptAggregator";
import {
  type BindingSinks,
  createVoiceBindings,
} from "../voiceSessionBindings";

function makeSinks() {
  return {
    publishTranscripts: vi.fn<(entries: AggEntry[]) => void>(),
    publishStatus: vi.fn(),
    publishTool: vi.fn(),
    setMicLevel: vi.fn(),
    computeRoute: vi.fn(),
  } satisfies BindingSinks;
}

describe("voiceSessionBindings", () => {
  let sinks: ReturnType<typeof makeSinks>;
  let bindings: ReturnType<typeof createVoiceBindings>;

  beforeEach(() => {
    sinks = makeSinks();
    bindings = createVoiceBindings(sinks);
  });

  it("case 15: consecutive same-role onTranscript fragments publish a single merged entry", () => {
    bindings.onTranscript({ role: "user", text: "你" });
    bindings.onTranscript({ role: "user", text: "好" });

    expect(sinks.publishTranscripts).toHaveBeenCalledTimes(2);
    const lastCall = sinks.publishTranscripts.mock.calls.at(
      -1,
    )?.[0] as AggEntry[];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].text).toBe("你好");
  });

  it("case 16: a listening->model-speaking->listening sequence seals user then model entries using internal prev, publishStatus called in order", () => {
    bindings.onTranscript({ role: "user", text: "問題" });
    bindings.onStatusChange({ status: "listening" });
    bindings.onStatusChange({ status: "model-speaking" });

    let entries = sinks.publishTranscripts.mock.calls.at(-1)?.[0] as AggEntry[];
    expect(entries[0].sealed).toBe(true);

    bindings.onTranscript({ role: "model", text: "答案" });
    bindings.onStatusChange({ status: "listening" });

    entries = sinks.publishTranscripts.mock.calls.at(-1)?.[0] as AggEntry[];
    expect(entries[1].sealed).toBe(true);

    expect(sinks.publishStatus.mock.calls.map((c) => c[0].status)).toEqual([
      "listening",
      "model-speaking",
      "listening",
    ]);
  });

  it("case 17: reset() clears transcripts and restarts id numbering; no stale entries survive", () => {
    bindings.onTranscript({ role: "user", text: "old" });
    bindings.reset();

    expect(sinks.publishTranscripts).toHaveBeenLastCalledWith([]);

    bindings.onTranscript({ role: "user", text: "new" });
    const entries = sinks.publishTranscripts.mock.calls.at(
      -1,
    )?.[0] as AggEntry[];
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(0);
    expect(entries[0].text).toBe("new");
  });

  it("case 18: onStatusChange to a non-active status zeroes micLevel; to an active status it does not", () => {
    for (const status of [
      "ended",
      "error",
      "needs-login",
      "reconnecting",
    ] as const) {
      const localSinks = makeSinks();
      const localBindings = createVoiceBindings(localSinks);
      localBindings.onStatusChange({ status });
      expect(localSinks.setMicLevel, status).toHaveBeenCalledWith(0);
    }

    const activeSinks = makeSinks();
    const activeBindings = createVoiceBindings(activeSinks);
    activeBindings.onStatusChange({ status: "listening" });
    expect(activeSinks.setMicLevel).not.toHaveBeenCalled();
  });

  it("case 19: dispose() zeroes micLevel", () => {
    bindings.dispose();
    expect(sinks.setMicLevel).toHaveBeenCalledWith(0);
  });

  it("case 20: wrapCaptureFrame publishes level before forwarding the same ArrayBuffer reference exactly once", () => {
    bindings.onStatusChange({ status: "listening" });
    sinks.setMicLevel.mockClear();

    const order: string[] = [];
    const frame = new ArrayBuffer(4);
    const forward = vi.fn<(frame: ArrayBuffer) => void>(() => {
      order.push("forward");
    });
    const handler = bindings.wrapCaptureFrame(forward);

    sinks.setMicLevel.mockImplementation(() => order.push("level"));
    handler(frame);

    expect(sinks.setMicLevel).toHaveBeenCalledTimes(1);
    expect(forward).toHaveBeenCalledTimes(1);
    expect(forward.mock.calls[0][0]).toBe(frame);
    expect(order).toEqual(["level", "forward"]);
  });

  it("suggestion #2: a frame arriving after a transition to a non-active status (e.g. playback-blocked) does not call setMicLevel, but the frame is still forwarded unchanged", () => {
    bindings.onStatusChange({ status: "listening" });
    const forward = vi.fn<(frame: ArrayBuffer) => void>();
    const handler = bindings.wrapCaptureFrame(forward);

    // Transition away from mic-active while capture keeps running.
    bindings.onStatusChange({ status: "playback-blocked" });
    sinks.setMicLevel.mockClear();

    const frame = new ArrayBuffer(4);
    handler(frame);

    expect(sinks.setMicLevel).not.toHaveBeenCalled();
    expect(forward).toHaveBeenCalledTimes(1);
    expect(forward.mock.calls[0][0]).toBe(frame);
  });
});
