/**
 * Microphone capture for the voice feature: 16k PCM16 upstream frames.
 *
 * Audio pipeline logic is ported from the backend reference implementation
 * `poc-client.html` (`captureWorklet` / `startMic`). See plan
 * `memory/reviews/plans/c53da5fe11faa273.md` §4 / §5.10.
 *
 * `createCapture()` performs a transactional setup: getUserMedia -> AudioContext
 * -> createObjectURL -> audioWorklet.addModule -> node wiring/connect. If any
 * step fails, every resource already acquired is released before the returned
 * promise rejects. The returned `stop()` releases every acquired resource
 * exactly once and is idempotent (repeated calls are no-ops), which is the
 * privacy invariant for this module: the microphone must never remain "hot"
 * after a failed setup or a repeated stop().
 */

export interface CreateCaptureDeps {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  AudioContext: new (contextOptions?: AudioContextOptions) => AudioContext;
  createObjectURL: (obj: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

export interface CaptureHandle {
  stop(): void;
}

const IN_RATE = 16000;
// 1600 samples per frame (IN_RATE / 10), matches backend poc-client.html captureWorklet.
const FRAME_SAMPLES = IN_RATE / 10;
const WORKLET_NAME = "accessible-map-capture";

// Inline AudioWorkletProcessor source, ported from poc-client.html captureWorklet (161-192):
// downsamples the render quantum's sample rate to 16k and posts an Int16Array frame
// every FRAME_SAMPLES (1600) samples.
const CAPTURE_WORKLET_SOURCE = `
  class Capture extends AudioWorkletProcessor {
    constructor() {
      super();
      this._buf = [];
      this._target = Math.round(sampleRate / ${IN_RATE});
      this._count = 0;
    }
    process(inputs) {
      const ch = inputs[0][0];
      if (!ch) return true;
      for (let i = 0; i < ch.length; i++) {
        this._count++;
        if (this._count >= this._target) {
          this._count = 0;
          this._buf.push(ch[i]);
        }
      }
      if (this._buf.length >= ${FRAME_SAMPLES}) {
        const out = new Int16Array(this._buf.length);
        for (let i = 0; i < this._buf.length; i++) {
          const s = Math.max(-1, Math.min(1, this._buf[i]));
          out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        this.port.postMessage(out.buffer, [out.buffer]);
        this._buf = [];
      }
      return true;
    }
  }
  registerProcessor('${WORKLET_NAME}', Capture);
`;

function resolveDeps(deps: Partial<CreateCaptureDeps>): CreateCaptureDeps {
  return {
    getUserMedia:
      deps.getUserMedia ??
      ((constraints) => navigator.mediaDevices.getUserMedia(constraints)),
    AudioContext: deps.AudioContext ?? AudioContext,
    createObjectURL: deps.createObjectURL ?? ((blob) => URL.createObjectURL(blob)),
    revokeObjectURL: deps.revokeObjectURL ?? ((url) => URL.revokeObjectURL(url)),
  };
}

/**
 * Starts microphone capture and invokes `onFrame` with a 16k PCM16 frame
 * (`ArrayBuffer` backing an Int16Array) roughly every 100ms.
 *
 * Rejects if any setup step fails; every resource acquired before the
 * failing step is released before the rejection is observed by the caller.
 */
export async function createCapture(
  onFrame: (frame: ArrayBuffer) => void,
  deps: Partial<CreateCaptureDeps> = {},
): Promise<CaptureHandle> {
  const { getUserMedia, AudioContext: AudioContextCtor, createObjectURL, revokeObjectURL } =
    resolveDeps(deps);

  let stream: MediaStream | undefined;
  let context: AudioContext | undefined;
  let objectUrl: string | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let workletNode: AudioWorkletNode | undefined;

  const releaseAcquired = (): void => {
    if (workletNode) {
      try {
        workletNode.port.onmessage = null;
      } catch {
        // ignore: best-effort release
      }
      try {
        workletNode.disconnect();
      } catch {
        // ignore: best-effort release
      }
    }
    if (source) {
      try {
        source.disconnect();
      } catch {
        // ignore: best-effort release
      }
    }
    if (stream) {
      try {
        for (const track of stream.getTracks()) track.stop();
      } catch {
        // ignore: best-effort release
      }
    }
    if (objectUrl) {
      try {
        revokeObjectURL(objectUrl);
      } catch {
        // ignore: best-effort release
      }
    }
    if (context && context.state !== "closed") {
      try {
        void context.close();
      } catch {
        // ignore: best-effort release
      }
    }
  };

  try {
    stream = await getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    context = new AudioContextCtor();
    const blob = new Blob([CAPTURE_WORKLET_SOURCE], { type: "application/javascript" });
    objectUrl = createObjectURL(blob);
    await context.audioWorklet.addModule(objectUrl);
    source = context.createMediaStreamSource(stream);
    workletNode = new AudioWorkletNode(context, WORKLET_NAME);
    workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      onFrame(event.data);
    };
    source.connect(workletNode);
  } catch (error) {
    releaseAcquired();
    throw error;
  }

  const capturedStream = stream;
  const capturedContext = context;
  const capturedObjectUrl = objectUrl;
  const capturedSource = source;
  const capturedWorkletNode = workletNode;

  let stopped = false;

  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    try {
      capturedWorkletNode.port.onmessage = null;
    } catch {
      // ignore: best-effort release
    }
    try {
      capturedWorkletNode.disconnect();
    } catch {
      // ignore: best-effort release
    }
    try {
      capturedSource.disconnect();
    } catch {
      // ignore: best-effort release
    }
    try {
      for (const track of capturedStream.getTracks()) track.stop();
    } catch {
      // ignore: best-effort release
    }
    try {
      revokeObjectURL(capturedObjectUrl);
    } catch {
      // ignore: best-effort release
    }
    try {
      if (capturedContext.state !== "closed") void capturedContext.close();
    } catch {
      // ignore: best-effort release
    }
  };

  return { stop };
}
