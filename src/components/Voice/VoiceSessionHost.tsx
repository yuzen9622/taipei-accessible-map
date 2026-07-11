"use client";

import { useEffect } from "react";
import useVoiceSession from "@/hook/useVoiceSession";
import useMapStore from "@/stores/useMapStore";
import useVoiceStore from "@/stores/useVoiceStore";
import VoiceFloatingIndicator from "./VoiceFloatingIndicator";

/**
 * Persistent voice-session owner (plan §4/§5.1, rev16). Exactly one
 * instance exists for the whole page (mounted in `ClientMap.tsx` next to
 * `AIChatBot`) and is never unmounted by the chat panel opening/closing —
 * that's the point of the background-execution model: the session (and
 * its recording indicator) must keep running while `AIChatBot` is
 * unmounted (`AIChatBot` returns `null`, and unmounts, whenever the panel
 * is closed or navigation starts).
 *
 * It owns the only `useVoiceSession()` instance, mirrors its state into
 * `useVoiceStore` so two independently-mounted subtrees (`VoiceModeView`
 * inside `AIChatBot`, and this component's own `VoiceFloatingIndicator`)
 * can both read it, binds the store's start/end/resumePlayback actions to
 * the real controller, and enforces the two termination rules that don't
 * belong to any single UI entry point: entering navigation mode, and this
 * host itself unmounting (leaving the map page).
 */
export default function VoiceSessionHost() {
  const {
    status,
    transcripts,
    activeTool,
    startSession,
    endSession,
    resumePlayback,
  } = useVoiceSession();

  useEffect(() => {
    useVoiceStore.getState().bindSessionActions({
      start: startSession,
      end: endSession,
      resumePlayback,
    });
  }, [startSession, endSession, resumePlayback]);

  useEffect(() => {
    useVoiceStore.getState().setStatus(status);
  }, [status]);

  useEffect(() => {
    useVoiceStore.getState().setTranscripts(transcripts);
  }, [transcripts]);

  useEffect(() => {
    useVoiceStore.getState().setActiveTool(activeTool);
  }, [activeTool]);

  // Entering navigation mode ends any active voice session — the
  // navigation HUD owns the screen, the same rule `AIChatBot` already
  // follows for its own panel (plan §2 out-of-scope / §7.3).
  useEffect(() => {
    const unsubscribe = useMapStore.subscribe((state) => {
      if (state.isNavigating) endSession();
    });
    return unsubscribe;
  }, [endSession]);

  // Leaving the map page (this host unmounting) is a terminal path too.
  useEffect(() => {
    return () => endSession();
  }, [endSession]);

  return <VoiceFloatingIndicator />;
}
