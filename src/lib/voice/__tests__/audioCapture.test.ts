import { afterEach, describe, expect, it, vi } from "vitest";
import { createCapture, type CreateCaptureDeps } from "../audioCapture";

interface FakeTrack {
  stop: ReturnType<typeof vi.fn>;
}

function makeFakeTrack(): FakeTrack {
  return { stop: vi.fn() };
}

function makeFakeStream(trackCount: number) {
  const tracks = Array.from({ length: trackCount }, () => makeFakeTrack());
  return {
    tracks,
    stream: {
      getTracks: () => tracks,
    } as unknown as MediaStream,
  };
}

interface FakeSource {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

function makeFakeSource(connectImpl?: () => void): FakeSource {
  return {
    connect: vi.fn(connectImpl),
    disconnect: vi.fn(),
  };
}

interface FakeWorkletNode {
  port: { onmessage: ((event: MessageEvent) => void) | null };
  disconnect: ReturnType<typeof vi.fn>;
}

function makeFakeWorkletNode(): FakeWorkletNode {
  return {
    port: { onmessage: null },
    disconnect: vi.fn(),
  };
}

interface FakeContext {
  state: "running" | "closed";
  audioWorklet: { addModule: ReturnType<typeof vi.fn> };
  createMediaStreamSource: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

function makeFakeContext(opts?: {
  addModuleImpl?: () => Promise<void>;
  createMediaStreamSourceImpl?: () => unknown;
}): FakeContext {
  const ctx: FakeContext = {
    state: "running",
    audioWorklet: {
      addModule: vi.fn(opts?.addModuleImpl ?? (() => Promise.resolve())),
    },
    createMediaStreamSource: vi.fn(
      opts?.createMediaStreamSourceImpl ?? (() => makeFakeSource()),
    ),
    close: vi.fn(() => {
      ctx.state = "closed";
      return Promise.resolve();
    }),
  };
  return ctx;
}

/**
 * vi.fn() forwards to its implementation as-is; an arrow-function
 * implementation cannot be invoked via `new` (production code does
 * `new AudioContextCtor(...)` / `new AudioWorkletNode(...)`). Wrap
 * constructor-mock implementations in a plain `function` so `new` works.
 */
function makeCtorMock<T>(impl: () => T): ReturnType<typeof vi.fn> {
  return vi.fn(function ctorMock() {
    return impl();
  });
}

function throwingCtorMock(error: unknown): ReturnType<typeof vi.fn> {
  return vi.fn(function throwingCtor() {
    throw error;
  });
}

function makeDeps(overrides: {
  getUserMedia?: CreateCaptureDeps["getUserMedia"];
  AudioContext?: CreateCaptureDeps["AudioContext"];
  createObjectURL?: CreateCaptureDeps["createObjectURL"];
  revokeObjectURL?: CreateCaptureDeps["revokeObjectURL"];
}): Partial<CreateCaptureDeps> {
  return overrides;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createCapture — internal release contract (plan §7.1 case 21)", () => {
  it("releases every acquired resource exactly once on stop(), and repeated stop() is a no-op", async () => {
    const { tracks, stream } = makeFakeStream(2);
    const fakeSource = makeFakeSource();
    const fakeContext = makeFakeContext({
      createMediaStreamSourceImpl: () => fakeSource,
    });
    const fakeWorkletNode = makeFakeWorkletNode();
    const createObjectURL = vi.fn(() => "blob:fake-url");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal(
      "AudioWorkletNode",
      makeCtorMock(() => fakeWorkletNode),
    );

    const AudioContextCtor = makeCtorMock(
      () => fakeContext,
    ) as unknown as CreateCaptureDeps["AudioContext"];

    const deps = makeDeps({
      getUserMedia: vi.fn(async () => stream),
      AudioContext: AudioContextCtor,
      createObjectURL,
      revokeObjectURL,
    });

    const onFrame = vi.fn();
    const { stop } = await createCapture(onFrame, deps);

    // A message should reach onFrame via the worklet port.
    const frame = new ArrayBuffer(4);
    fakeWorkletNode.port.onmessage?.({ data: frame } as MessageEvent);
    expect(onFrame).toHaveBeenCalledWith(frame);

    stop();

    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
    expect(fakeSource.disconnect).toHaveBeenCalledTimes(1);
    expect(fakeWorkletNode.disconnect).toHaveBeenCalledTimes(1);
    expect(fakeWorkletNode.port.onmessage).toBeNull();
    expect(fakeContext.close).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");

    // Repeated stop() must not repeat any release side effect.
    stop();
    stop();

    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
    expect(fakeSource.disconnect).toHaveBeenCalledTimes(1);
    expect(fakeWorkletNode.disconnect).toHaveBeenCalledTimes(1);
    expect(fakeContext.close).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});

describe("createCapture — transactional setup fault injection (plan §7.1 case 26)", () => {
  it("releases acquired stream tracks and rejects when the AudioContext constructor throws", async () => {
    const { tracks, stream } = makeFakeStream(2);
    const revokeObjectURL = vi.fn();
    const error = new Error("AudioContext construction failed");
    const AudioContextCtor = throwingCtorMock(
      error,
    ) as unknown as CreateCaptureDeps["AudioContext"];

    const deps = makeDeps({
      getUserMedia: vi.fn(async () => stream),
      AudioContext: AudioContextCtor,
      createObjectURL: vi.fn(() => "blob:fake-url"),
      revokeObjectURL,
    });

    await expect(createCapture(vi.fn(), deps)).rejects.toThrow(error);

    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("releases stream tracks and the context and rejects when createObjectURL throws", async () => {
    const { tracks, stream } = makeFakeStream(1);
    const fakeContext = makeFakeContext();
    const revokeObjectURL = vi.fn();
    const error = new Error("createObjectURL failed");

    const deps = makeDeps({
      getUserMedia: vi.fn(async () => stream),
      AudioContext: makeCtorMock(
        () => fakeContext,
      ) as unknown as CreateCaptureDeps["AudioContext"],
      createObjectURL: vi.fn(() => {
        throw error;
      }),
      revokeObjectURL,
    });

    await expect(createCapture(vi.fn(), deps)).rejects.toThrow(error);

    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
    expect(fakeContext.close).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
  });

  it("releases tracks, blob URL and context and rejects when audioWorklet.addModule rejects", async () => {
    const { tracks, stream } = makeFakeStream(1);
    const error = new Error("addModule failed");
    const fakeContext = makeFakeContext({
      addModuleImpl: () => Promise.reject(error),
    });
    const revokeObjectURL = vi.fn();

    const deps = makeDeps({
      getUserMedia: vi.fn(async () => stream),
      AudioContext: makeCtorMock(
        () => fakeContext,
      ) as unknown as CreateCaptureDeps["AudioContext"],
      createObjectURL: vi.fn(() => "blob:fake-url"),
      revokeObjectURL,
    });

    await expect(createCapture(vi.fn(), deps)).rejects.toThrow(error);

    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
    expect(fakeContext.close).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("releases every acquired resource and rejects when source.connect throws", async () => {
    const { tracks, stream } = makeFakeStream(1);
    const error = new Error("connect failed");
    const fakeSource = makeFakeSource(() => {
      throw error;
    });
    const fakeContext = makeFakeContext({
      createMediaStreamSourceImpl: () => fakeSource,
    });
    const fakeWorkletNode = makeFakeWorkletNode();
    const revokeObjectURL = vi.fn();

    vi.stubGlobal(
      "AudioWorkletNode",
      makeCtorMock(() => fakeWorkletNode),
    );

    const deps = makeDeps({
      getUserMedia: vi.fn(async () => stream),
      AudioContext: makeCtorMock(
        () => fakeContext,
      ) as unknown as CreateCaptureDeps["AudioContext"],
      createObjectURL: vi.fn(() => "blob:fake-url"),
      revokeObjectURL,
    });

    await expect(createCapture(vi.fn(), deps)).rejects.toThrow(error);

    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1);
    }
    expect(fakeWorkletNode.disconnect).toHaveBeenCalledTimes(1);
    expect(fakeWorkletNode.port.onmessage).toBeNull();
    expect(fakeContext.close).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
