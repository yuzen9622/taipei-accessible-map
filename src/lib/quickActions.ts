import {
  Accessibility,
  AlertTriangle,
  Bus,
  CircleParking,
  Cloud,
  Heart,
} from "lucide-react";

// Every available quick action; the user picks which ones show (persisted).
export type QuickActionId =
  | "a11y"
  | "hazard"
  | "parking"
  | "bus"
  | "environment"
  | "welfare";

/**
 * Neutral chrome, colored icon only — the §0.4 fix. The old version colored
 * the whole pill (`bg-x-500/10 text-x-600`), which put six category colors on
 * screen at once next to the primary blue and SOS red. Apple/Linear keep the
 * chrome neutral and let color carry meaning only where the data needs it.
 */
export const QUICK_ACTION_DEFS: {
  id: QuickActionId;
  labelKey: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
}[] = [
  {
    id: "a11y",
    labelKey: "a11yFacilities",
    Icon: Accessibility,
    iconClassName: "text-accessibility",
  },
  {
    id: "hazard",
    labelKey: "reportHazard",
    Icon: AlertTriangle,
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "parking",
    labelKey: "parking",
    Icon: CircleParking,
    iconClassName: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "bus",
    labelKey: "busInfo",
    Icon: Bus,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "environment",
    labelKey: "environment",
    Icon: Cloud,
    iconClassName: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "welfare",
    labelKey: "welfare",
    Icon: Heart,
    iconClassName: "text-rose-600 dark:text-rose-400",
  },
];

export const DEFAULT_QUICK_ACTIONS: QuickActionId[] = [
  "a11y",
  "hazard",
  "parking",
  "bus",
];

export const QUICK_ACTIONS_STORAGE_KEY = "quickActions";

/** Accept only known ids so a corrupted/downgraded payload can't leak through. */
export function sanitizeQuickActionIds(raw: unknown): QuickActionId[] {
  if (!Array.isArray(raw)) return DEFAULT_QUICK_ACTIONS;
  const ids = raw
    // "metro" was the old id of the a11y quick action.
    .map((id) => (id === "metro" ? "a11y" : id))
    .filter((id): id is QuickActionId =>
      QUICK_ACTION_DEFS.some((d) => d.id === id),
    );
  return ids;
}
