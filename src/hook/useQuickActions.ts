"use client";

import { useCallback, useEffect, useState } from "react";

export interface QuickAction {
  id: string;
  visible: boolean;
}

const STORAGE_KEY = "quickActions";

const DEFAULTS: QuickAction[] = [
  { id: "environment", visible: true },
  { id: "hazard", visible: true },
  { id: "parking", visible: true },
  { id: "bus", visible: true },
  { id: "welfare", visible: false },
];

function loadFromStorage(): QuickAction[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as QuickAction[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULTS;
    return parsed;
  } catch {
    return DEFAULTS;
  }
}

function saveToStorage(actions: QuickAction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}

export default function useQuickActions() {
  const [actions, setActions] = useState<QuickAction[]>(DEFAULTS);

  useEffect(() => {
    setActions(loadFromStorage());
  }, []);

  const visibleActions = actions.filter((a) => a.visible).slice(0, 4);

  const toggleVisibility = useCallback((id: string) => {
    setActions((prev) => {
      const updated = prev.map((a) =>
        a.id === id ? { ...a, visible: !a.visible } : a
      );
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setActions((prev) => {
      if (fromIndex === toIndex) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setActions(DEFAULTS);
  }, []);

  return { actions, visibleActions, toggleVisibility, moveItem, reset };
}
