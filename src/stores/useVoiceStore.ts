"use client";

import { create } from "zustand";
import type {
  VoiceStatus,
  VoiceToolEvent,
  VoiceTranscript,
} from "@/lib/voice/voiceSession";

/**
 * `"panel"` = the voice session's live UI is shown inside the AIChatBot
 * panel (`VoiceModeView`). `"pill"` = the session keeps running in the
 * background while the panel (if open) shows the ordinary text chat; the
 * always-mounted `VoiceFloatingIndicator` is what stays visible instead.
 * See plan `memory/reviews/plans/c53da5fe11faa273.md` §5.1/§5.6.
 */
export type VoiceViewMode = "panel" | "pill";

/**
 * `VoiceTranscript` (from the controller) plus a synthetic, monotonically
 * increasing `id` assigned on append — gives `VoiceModeView` a stable React
 * key without needing the controller/protocol layer to know about React.
 */
export interface VoiceTranscriptEntry extends VoiceTranscript {
  id: number;
}

interface VoiceSessionActions {
  start: () => void;
  end: () => void;
  resumePlayback: () => void;
}

interface VoiceState {
  status: VoiceStatus;
  transcripts: VoiceTranscriptEntry[];
  activeTool: VoiceToolEvent | null;
  viewMode: VoiceViewMode;
}

interface VoiceActions {
  setStatus: (status: VoiceStatus) => void;
  setTranscripts: (transcripts: VoiceTranscriptEntry[]) => void;
  setActiveTool: (tool: VoiceToolEvent | null) => void;
  setViewMode: (mode: VoiceViewMode) => void;
  /**
   * Bound exactly once, by the always-mounted `VoiceSessionHost`, to the
   * real controller-backed functions returned by `useVoiceSession` (plan
   * §4 useVoiceStore row: "actions 由 Host 綁定注入"). Every UI entry
   * point (mic button, view/pill end buttons, resume-playback button)
   * calls the store's `startSession`/`endSession`/`resumePlayback` rather
   * than holding its own reference to the controller, since the
   * controller instance only exists inside the Host.
   */
  bindSessionActions: (actions: VoiceSessionActions) => void;
  startSession: () => void;
  endSession: () => void;
  resumePlayback: () => void;
}

type VoiceStore = VoiceState & VoiceActions;

const noop = () => {};

const useVoiceStore = create<VoiceStore>((set) => ({
  status: { status: "idle" },
  transcripts: [],
  activeTool: null,
  viewMode: "panel",
  setStatus: (status) => set({ status }),
  setTranscripts: (transcripts) => set({ transcripts }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setViewMode: (viewMode) => set({ viewMode }),
  bindSessionActions: (actions) =>
    set({
      startSession: actions.start,
      endSession: actions.end,
      resumePlayback: actions.resumePlayback,
    }),
  // Before VoiceSessionHost mounts and binds the real actions, calls are
  // harmless no-ops rather than crashes.
  startSession: noop,
  endSession: noop,
  resumePlayback: noop,
}));

export default useVoiceStore;
