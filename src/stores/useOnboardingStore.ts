import { create } from "zustand";
import {
  type A11yProfile,
  type A11yRouteMode,
  type A11ySituation,
  DEFAULT_A11Y_PROFILE,
  deriveRouteMode,
  impliesStepFree,
} from "@/types/a11yProfile";

/**
 * Version-suffixed storage keys. A future redesign that genuinely needs to
 * re-teach everyone bumps the suffix (`.v2`) instead of clearing these keys —
 * that way the tour runs again without wiping the user's saved preferences.
 */
export const ONBOARDING_KEY = "onboarding.v1";
export const WELCOME_CARD_KEY = "welcomeCard.v1.dismissed";
export const COACH_MARKS_KEY = "coachMarks.v1.done";
export const A11Y_PROFILE_KEY = "a11yProfile.v1";

export interface OnboardingRecord {
  completedAt: string | null;
  skipped: boolean;
}

interface OnboardingState {
  /**
   * False until `initFromStorage` runs. Every consumer must gate on this:
   * localStorage is unavailable during SSR, so rendering the onboarding
   * overlay before hydration would flash it at returning users.
   */
  hydrated: boolean;
  onboarding: OnboardingRecord | null;
  welcomeCardDismissed: boolean;
  coachMarksDone: boolean;
  /**
   * Whether the 3-step spotlight tour is currently running. Deliberately not
   * persisted — this is a transient "is the overlay up right now" flag, not a
   * one-time-record like the other three keys.
   */
  coachMarksActive: boolean;
  profile: A11yProfile;
}

interface OnboardingActions {
  initFromStorage: () => void;
  setSituations: (situations: A11ySituation[]) => void;
  toggleSituation: (situation: A11ySituation) => void;
  setRouteMode: (mode: A11yRouteMode) => void;
  setProfileFlag: (
    key: "avoidStairs" | "requireElevator",
    value: boolean,
  ) => void;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  dismissWelcomeCard: () => void;
  startCoachMarks: () => void;
  finishCoachMarks: () => void;
  /** Settings → "重看新手導覽": clears all three one-time flags, keeps the profile. */
  resetGuides: () => void;
}

type OnboardingStore = OnboardingState & OnboardingActions;

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A private-mode or quota failure must never break the flow; the user just
    // sees the guide again next visit, which is recoverable.
  }
}

function removeKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Accept only known situation ids so a corrupted or downgraded payload cannot
 * put an unknown string into the profile and reach the route request.
 */
function sanitizeProfile(raw: unknown): A11yProfile {
  if (!raw || typeof raw !== "object") return DEFAULT_A11Y_PROFILE;
  const value = raw as Partial<A11yProfile>;
  const allowed: A11ySituation[] = [
    "wheelchair",
    "walker",
    "vision",
    "slow",
    "stroller",
    "companion",
  ];
  const situations = Array.isArray(value.situations)
    ? value.situations.filter((s): s is A11ySituation =>
        allowed.includes(s as A11ySituation),
      )
    : [];
  const allowedModes: A11yRouteMode[] = [
    "normal",
    "wheelchair",
    "elderly",
    "visual_impaired",
  ];
  const routeModeAuto = value.routeModeAuto !== false;
  const storedMode = allowedModes.includes(value.routeMode as A11yRouteMode)
    ? (value.routeMode as A11yRouteMode)
    : null;
  const stepFreeFlagsAuto = value.stepFreeFlagsAuto !== false;
  const stepFree = impliesStepFree(situations);

  return {
    situations,
    // An auto profile always recomputes, so a stale stored mode from an older
    // derivation rule can never outlive a change to `deriveRouteMode`.
    routeMode: routeModeAuto
      ? deriveRouteMode(situations)
      : (storedMode ?? deriveRouteMode(situations)),
    routeModeAuto,
    avoidStairs: stepFreeFlagsAuto ? stepFree : value.avoidStairs === true,
    requireElevator: stepFreeFlagsAuto
      ? stepFree
      : value.requireElevator === true,
    stepFreeFlagsAuto,
  };
}

const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  hydrated: false,
  onboarding: null,
  welcomeCardDismissed: false,
  coachMarksDone: false,
  coachMarksActive: false,
  profile: DEFAULT_A11Y_PROFILE,

  initFromStorage: () => {
    if (get().hydrated) return;
    set({
      hydrated: true,
      onboarding: readJson<OnboardingRecord>(ONBOARDING_KEY),
      welcomeCardDismissed:
        typeof window !== "undefined" &&
        localStorage.getItem(WELCOME_CARD_KEY) === "true",
      coachMarksDone:
        typeof window !== "undefined" &&
        localStorage.getItem(COACH_MARKS_KEY) === "true",
      profile: sanitizeProfile(readJson(A11Y_PROFILE_KEY)),
    });
  },

  setSituations: (situations) => {
    const prev = get().profile;
    const next: A11yProfile = {
      ...prev,
      situations,
      routeMode: prev.routeModeAuto
        ? deriveRouteMode(situations)
        : prev.routeMode,
      // Both directions matter: de-selecting the last step-free situation has
      // to relax these again, otherwise a mis-tap would permanently narrow
      // every future route.
      avoidStairs: prev.stepFreeFlagsAuto
        ? impliesStepFree(situations)
        : prev.avoidStairs,
      requireElevator: prev.stepFreeFlagsAuto
        ? impliesStepFree(situations)
        : prev.requireElevator,
    };
    writeJson(A11Y_PROFILE_KEY, next);
    set({ profile: next });
  },

  toggleSituation: (situation) => {
    const current = get().profile.situations;
    const next = current.includes(situation)
      ? current.filter((s) => s !== situation)
      : [...current, situation];
    get().setSituations(next);
  },

  setRouteMode: (mode) => {
    // A manual pick permanently detaches routeMode from the derivation.
    const next: A11yProfile = {
      ...get().profile,
      routeMode: mode,
      routeModeAuto: false,
    };
    writeJson(A11Y_PROFILE_KEY, next);
    set({ profile: next });
  },

  setProfileFlag: (key, value) => {
    const next: A11yProfile = {
      ...get().profile,
      [key]: value,
      stepFreeFlagsAuto: false,
    };
    writeJson(A11Y_PROFILE_KEY, next);
    set({ profile: next });
  },

  completeOnboarding: () => {
    const record: OnboardingRecord = {
      completedAt: new Date().toISOString(),
      skipped: false,
    };
    writeJson(ONBOARDING_KEY, record);
    set({ onboarding: record });
  },

  skipOnboarding: () => {
    const record: OnboardingRecord = {
      completedAt: new Date().toISOString(),
      skipped: true,
    };
    writeJson(ONBOARDING_KEY, record);
    set({ onboarding: record });
  },

  dismissWelcomeCard: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(WELCOME_CARD_KEY, "true");
      } catch {
        // ignore
      }
    }
    set({ welcomeCardDismissed: true });
  },

  startCoachMarks: () => {
    // Starting the tour is itself a decision about the welcome card — the
    // card's job (point at the 3 things worth knowing) is superseded the
    // moment the user commits to the guided version instead.
    get().dismissWelcomeCard();
    set({ coachMarksActive: true });
  },

  finishCoachMarks: () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(COACH_MARKS_KEY, "true");
      } catch {
        // ignore
      }
    }
    set({ coachMarksDone: true, coachMarksActive: false });
  },

  resetGuides: () => {
    removeKey(ONBOARDING_KEY);
    removeKey(WELCOME_CARD_KEY);
    removeKey(COACH_MARKS_KEY);
    set({
      onboarding: null,
      welcomeCardDismissed: false,
      coachMarksDone: false,
    });
  },
}));

export default useOnboardingStore;
