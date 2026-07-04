"use client";
import { create } from "zustand";
import type { NavInstruction } from "@/types/route";

export type HeadingSource = "compass" | "gps" | null;
export type CompassPermission = "unknown" | "granted" | "denied";

/**
 * High-frequency turn-by-turn runtime state, kept OUT of useMapStore on
 * purpose: useMapStore is destructured wholesale by ClientMap and friends, so
 * writing heading/step there every GPS/compass tick would re-render the whole
 * map. Consumers here subscribe with selectors (useNavStore(s => s.field)).
 */
interface NavState {
  instructions: NavInstruction[];
  currentStepIndex: number;
  distanceToNextM: number | null;
  /** Combined heading shown by the marker / used to rotate the map. */
  userHeading: number | null;
  /** Raw course-over-ground from the geolocation watch (fallback source). */
  gpsHeading: number | null;
  headingSource: HeadingSource;
  isOffRoute: boolean;
  arrived: boolean;
  compassPermission: CompassPermission;
  /** Timestamp of the last manual step change; brief lock against auto-advance. */
  lastManualTs: number;
  /** True after the user drags the map mid-navigation; camera-follow pauses. */
  followPaused: boolean;
  /** Meters left along the whole route (written by the engine). */
  remainingM: number | null;
  /** Total route length in meters (set when instructions load). */
  routeTotalM: number | null;
  /** TTS announcements on step changes. */
  voiceEnabled: boolean;
  /** Step-list panel visibility while the nav HUD owns the screen. */
  stepListOpen: boolean;
}

interface NavAction {
  setInstructions: (instructions: NavInstruction[]) => void;
  setCurrentStepIndex: (index: number) => void;
  /** Manual override from the prev/next buttons. */
  setStepIndex: (index: number) => void;
  setDistanceToNextM: (m: number | null) => void;
  setUserHeading: (deg: number | null, source: HeadingSource) => void;
  setGpsHeading: (deg: number | null) => void;
  setIsOffRoute: (v: boolean) => void;
  setArrived: (v: boolean) => void;
  setCompassPermission: (p: CompassPermission) => void;
  setFollowPaused: (v: boolean) => void;
  setRemainingM: (m: number | null) => void;
  setRouteTotalM: (m: number | null) => void;
  setVoiceEnabled: (v: boolean) => void;
  setStepListOpen: (v: boolean) => void;
  reset: () => void;
}

type NavStore = NavState & NavAction;

const initialState: NavState = {
  instructions: [],
  currentStepIndex: 0,
  distanceToNextM: null,
  userHeading: null,
  gpsHeading: null,
  headingSource: null,
  isOffRoute: false,
  arrived: false,
  compassPermission: "unknown",
  lastManualTs: 0,
  followPaused: false,
  remainingM: null,
  routeTotalM: null,
  voiceEnabled: false,
  stepListOpen: false,
};

const useNavStore = create<NavStore>((set) => ({
  ...initialState,
  setInstructions: (instructions) =>
    set({
      instructions,
      currentStepIndex: 0,
      arrived: false,
      isOffRoute: false,
    }),
  setCurrentStepIndex: (currentStepIndex) => set({ currentStepIndex }),
  setStepIndex: (currentStepIndex) =>
    set({ currentStepIndex, lastManualTs: Date.now() }),
  setDistanceToNextM: (distanceToNextM) => set({ distanceToNextM }),
  setUserHeading: (userHeading, headingSource) =>
    set({ userHeading, headingSource }),
  setGpsHeading: (gpsHeading) => set({ gpsHeading }),
  setIsOffRoute: (isOffRoute) => set({ isOffRoute }),
  setArrived: (arrived) => set({ arrived }),
  setCompassPermission: (compassPermission) => set({ compassPermission }),
  setFollowPaused: (followPaused) => set({ followPaused }),
  setRemainingM: (remainingM) => set({ remainingM }),
  setRouteTotalM: (routeTotalM) => set({ routeTotalM }),
  setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
  setStepListOpen: (stepListOpen) => set({ stepListOpen }),
  // Keep the iOS compass-permission grant across navigation sessions.
  reset: () =>
    set((s) => ({ ...initialState, compassPermission: s.compassPermission })),
}));

export default useNavStore;
