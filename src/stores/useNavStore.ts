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
  // Keep the iOS compass-permission grant across navigation sessions.
  reset: () =>
    set((s) => ({ ...initialState, compassPermission: s.compassPermission })),
}));

export default useNavStore;
