import { create } from "zustand";
import {
  DEFAULT_QUICK_ACTIONS,
  QUICK_ACTIONS_STORAGE_KEY,
  type QuickActionId,
  sanitizeQuickActionIds,
} from "@/lib/quickActions";

/**
 * Shared, reactive "which home-screen shortcuts are enabled" state. Needs to
 * be a store rather than a per-component `useState` + localStorage read: the
 * editor moved to Settings (§S5 item 5 — customizing shortcuts doesn't belong
 * on the home screen a first-time visitor sees), which is a Dialog stacked on
 * top of the still-mounted home screen, so a toggle there has to be visible
 * the moment Settings closes, not after a reload.
 */
interface QuickActionsState {
  hydrated: boolean;
  enabledActions: QuickActionId[];
  initFromStorage: () => void;
  toggleAction: (id: QuickActionId) => void;
}

const useQuickActionsStore = create<QuickActionsState>((set, get) => ({
  hydrated: false,
  enabledActions: DEFAULT_QUICK_ACTIONS,

  initFromStorage: () => {
    if (get().hydrated) return;
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(QUICK_ACTIONS_STORAGE_KEY);
    if (!stored) {
      set({ hydrated: true });
      return;
    }
    try {
      set({
        hydrated: true,
        enabledActions: sanitizeQuickActionIds(JSON.parse(stored)),
      });
    } catch {
      set({ hydrated: true });
    }
  },

  toggleAction: (id) => {
    const current = get().enabledActions;
    const next = current.includes(id)
      ? current.filter((a) => a !== id)
      : [...current, id];
    try {
      localStorage.setItem(QUICK_ACTIONS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // A quota/private-mode failure only costs persistence, not correctness.
    }
    set({ enabledActions: next });
  },
}));

export default useQuickActionsStore;
