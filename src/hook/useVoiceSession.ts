"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { refreshAccessToken } from "@/lib/authRefresh";
import { END_POINT } from "@/lib/config";
import { createCapture } from "@/lib/voice/audioCapture";
import { createPlayback } from "@/lib/voice/audioPlayback";
import {
  VoiceSessionController,
  type VoiceSocket,
  type VoiceStatus,
  type VoiceToolEvent,
} from "@/lib/voice/voiceSession";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import type { VoiceTranscriptEntry } from "@/stores/useVoiceStore";

/**
 * Derive the voice WS URL from `END_POINT` (plan §3/§8). Every existing
 * `src/lib/api/*.ts` call builds URLs as `${END_POINT}/api/v1/...`, so
 * `END_POINT` itself carries no `/api/v1` prefix — this mirrors that
 * convention and only swaps the http(s) scheme for ws(s).
 */
function buildWsUrl(): string {
  const url = new URL(`${END_POINT}/api/v1/voice/ws`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

const VOICE_WS_URL = buildWsUrl();

/**
 * Native WebSocket adapter (plan §5.9 / round3-F1). `binaryType` is set to
 * `"arraybuffer"` immediately after construction — before any handler is
 * wired up on either the real socket or the adapter object — because the
 * browser default (`"blob"`) would make the controller's downlink
 * dispatch discard every binary frame as an unrecognized payload type
 * instead of forwarding it to playback.
 */
function createSocket(url: string): VoiceSocket {
  const ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";

  const socket: VoiceSocket = {
    send: (data) => ws.send(data),
    close: (code, reason) => ws.close(code, reason),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
  };

  ws.onopen = () => socket.onopen?.();
  ws.onmessage = (event) => socket.onmessage?.({ data: event.data });
  ws.onclose = (event) =>
    socket.onclose?.({ code: event.code, reason: event.reason });
  ws.onerror = (event) => socket.onerror?.(event);

  return socket;
}

function getUserLocation(): { latitude: number; longitude: number } | null {
  const location = useMapStore.getState().userLocation;
  if (!location) return null;
  const { lat, lng } = location;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { latitude: lat, longitude: lng };
}

export interface UseVoiceSessionResult {
  status: VoiceStatus;
  transcripts: VoiceTranscriptEntry[];
  activeTool: VoiceToolEvent | null;
  startSession: () => void;
  endSession: () => void;
  resumePlayback: () => void;
}

/**
 * Thin React wrapper around `VoiceSessionController` (plan §4). The sole
 * consumer is `VoiceSessionHost`, which mirrors the state returned here
 * into `useVoiceStore` so it stays available to `VoiceModeView` and
 * `VoiceFloatingIndicator` even while `AIChatBot` (and this hook's own
 * previous instance) has unmounted.
 */
export default function useVoiceSession(): UseVoiceSessionResult {
  const [status, setStatusState] = useState<VoiceStatus>({ status: "idle" });
  const [transcripts, setTranscripts] = useState<VoiceTranscriptEntry[]>([]);
  const [activeTool, setActiveTool] = useState<VoiceToolEvent | null>(null);
  const nextTranscriptId = useRef(0);

  // Read inside the auth subscription below without re-subscribing on
  // every status change.
  const statusRef = useRef(status);
  statusRef.current = status;

  // Identity captured when startSession() runs; compared against the auth
  // store on every change while the session is active (plan §5.8 rev13).
  const identityAtStartRef = useRef<string | null>(null);

  const controllerRef = useRef<VoiceSessionController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new VoiceSessionController({
      wsUrl: VOICE_WS_URL,
      createSocket,
      refreshAuth: () => refreshAccessToken(),
      getToken: () => useAuthStore.getState().session?.accessToken,
      getAuthIdentity: () => useAuthStore.getState().user?._id ?? null,
      getUserLocation,
      createCapture: (onFrame) => createCapture(onFrame),
      createPlayback: () => createPlayback(),
      onStatusChange: (next) => {
        statusRef.current = next;
        setStatusState(next);
      },
      onTranscript: (transcript) =>
        setTranscripts((prev) => [
          ...prev,
          { ...transcript, id: nextTranscriptId.current++ },
        ]),
      onToolEvent: (event) => setActiveTool(event),
    });
  }

  // §5.8 rev13: a session already in progress must end as soon as the
  // token disappears or the signed-in identity changes underneath it —
  // the controller only re-validates identity at specific points (start,
  // (re)connect, refresh), so this proactive subscription is what ends an
  // already-`listening` session immediately on logout/account switch
  // instead of waiting for the next reconnect attempt.
  useEffect(() => {
    const unsubscribe = useAuthStore.subscribe((state) => {
      const current = statusRef.current.status;
      if (current === "idle" || current === "ended") return; // nothing active
      const token = state.session?.accessToken;
      const identity = state.user?._id ?? null;
      if (!token || identity !== identityAtStartRef.current) {
        controllerRef.current?.end();
      }
    });
    return unsubscribe;
  }, []);

  // Unmount cleanup (plan §4 useVoiceSession row): cancels timers, closes
  // the socket, and releases audio resources via controller.end().
  useEffect(() => {
    return () => controllerRef.current?.end();
  }, []);

  const startSession = useCallback(() => {
    identityAtStartRef.current = useAuthStore.getState().user?._id ?? null;
    setTranscripts([]);
    setActiveTool(null);
    controllerRef.current?.start();
  }, []);

  const endSession = useCallback(() => {
    controllerRef.current?.end();
  }, []);

  const resumePlayback = useCallback(() => {
    controllerRef.current?.resumePlayback();
  }, []);

  return {
    status,
    transcripts,
    activeTool,
    startSession,
    endSession,
    resumePlayback,
  };
}
