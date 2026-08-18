import {
  Accessibility,
  CornerRightUp,
  MoveVertical,
  Toilet as ToiletIcon,
  TrendingUp,
} from "lucide-react";
import type { AccessibleRoute, RouteLeg, SlimOsmA11y } from "@/types/route";

// --- Pure helpers (exported for unit testing, see __tests__/RouteCard.test.ts) ---

// exitName may already spell out the exit number (e.g. "2號出口"); appending
// again would render "2號出口 (2 號出口)". Plain `.includes()` would also
// false-positive on numeric coincidences like "12號出口" containing "2", so
// this checks the number is not part of a larger digit/letter run.
export function shouldAppendExitNumber(
  exitName: string | undefined,
  exitNumber: string | undefined,
): boolean {
  if (!exitNumber) return false;
  if (!exitName) return true;
  const escaped = exitNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![0-9A-Za-z])${escaped}(?![0-9A-Za-z])`);
  return !pattern.test(exitName);
}

const CONFIDENCE_LABEL_KEY: Record<
  NonNullable<AccessibleRoute["dataConfidence"]>,
  string
> = {
  high: "confidenceHigh",
  medium: "confidenceMedium",
  low: "confidenceLow",
};

export function getConfidenceLabelKey(
  confidence: AccessibleRoute["dataConfidence"],
): string | null {
  return confidence ? (CONFIDENCE_LABEL_KEY[confidence] ?? null) : null;
}

export function getRouteAlertsCount(route: AccessibleRoute): number {
  if (!route?.legs) return 0;
  const seenAlertIds = new Set<string>();
  let count = 0;

  for (const leg of route.legs) {
    if ("alerts" in leg && Array.isArray(leg.alerts)) {
      for (const alert of leg.alerts) {
        if (alert && typeof alert === "object") {
          const id = (alert as { alertId?: string }).alertId;
          if (id) {
            if (!seenAlertIds.has(id)) {
              seenAlertIds.add(id);
              count++;
            }
          } else {
            count++;
          }
        }
      }
    }
  }

  if (route.transitAlerts && Array.isArray(route.transitAlerts)) {
    for (const alert of route.transitAlerts) {
      if (alert && typeof alert === "object") {
        const id = alert.alertId;
        if (id) {
          if (!seenAlertIds.has(id)) {
            seenAlertIds.add(id);
            count++;
          }
        } else {
          count++;
        }
      }
    }
  }

  return count;
}

// Order-preserving, first-seen-wins de-duplication of a11y facility
// categories, used to render one icon per distinct category instead of one
// per facility.
export function dedupeA11yCategories(
  items: SlimOsmA11y[] | undefined,
): SlimOsmA11y["category"][] {
  if (!items?.length) return [];
  const seen = new Set<SlimOsmA11y["category"]>();
  const out: SlimOsmA11y["category"][] = [];
  for (const item of items) {
    if (!seen.has(item.category)) {
      seen.add(item.category);
      out.push(item.category);
    }
  }
  return out;
}

export const A11Y_CATEGORY_ICON: Record<
  SlimOsmA11y["category"],
  typeof Accessibility
> = {
  wheelchair_accessible: Accessibility,
  elevator: MoveVertical,
  ramp: TrendingUp,
  kerb_cut: CornerRightUp,
  toilet: ToiletIcon,
};

export function getA11yCategoryLabelKey(
  category: SlimOsmA11y["category"],
): string {
  switch (category) {
    case "wheelchair_accessible":
      return "wheelchairAccess";
    case "elevator":
      return "elevator";
    case "ramp":
      return "ramp";
    case "kerb_cut":
      return "kerbCut";
    case "toilet":
      return "toilet";
  }
}

export function getWheelchairStatusKey(
  wheelchair: SlimOsmA11y["wheelchair"] | undefined,
): string | null {
  switch (wheelchair) {
    case "yes":
      return "wheelchairYes";
    case "limited":
      return "wheelchairLimited";
    case "no":
      return "wheelchairNo";
    default:
      return null;
  }
}

export type PointLabelContext = {
  originPosition?: { lat: number; lng: number } | null;
  destinationPosition?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  originName?: string;
  destinationName?: string;
  originFallback: string;
  destinationFallback: string;
  myLocationFallback: string;
};

export const getPointLabel = (
  point: unknown,
  ctx: PointLabelContext,
  isOriginFallback = false,
  isDestFallback = false,
): string => {
  if (!point) return "";
  if (typeof point === "string") return point;
  if (typeof point === "object" && point !== null) {
    const p = point as Record<string, unknown>;
    const label = p.name || p.address || p.label;
    if (typeof label === "string" && label.trim() !== "") return label;

    const lat = Number(p.lat ?? p.latitude);
    const lng = Number(p.lng ?? p.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (ctx.originPosition) {
        const dist = Math.hypot(
          ctx.originPosition.lat - lat,
          ctx.originPosition.lng - lng,
        );
        if (dist < 0.001) return ctx.originName || ctx.originFallback;
      } else if (ctx.userLocation) {
        const dist = Math.hypot(
          ctx.userLocation.lat - lat,
          ctx.userLocation.lng - lng,
        );
        if (dist < 0.001) return ctx.originName || ctx.myLocationFallback;
      }

      if (ctx.destinationPosition) {
        const dist = Math.hypot(
          ctx.destinationPosition.lat - lat,
          ctx.destinationPosition.lng - lng,
        );
        if (dist < 0.001) return ctx.destinationName || ctx.destinationFallback;
      }

      if (isOriginFallback && ctx.originName) return ctx.originName;
      if (isDestFallback && ctx.destinationName) return ctx.destinationName;

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }
  return String(point);
};

export const scoreBarColor = (value: number) => {
  if (value >= 80) return "#22c55e";
  if (value >= 60) return "#84cc16";
  if (value >= 40) return "#eab308";
  return "#f97316";
};

export const LABEL_TO_SCORE: Record<string, number> = {
  excellent: 90,
  good: 70,
  fair: 50,
  poor: 30,
  critical: 10,
};

export const STAR_COLOR: Record<number, string> = {
  5: "text-emerald-600 dark:text-emerald-400",
  4: "text-lime-600 dark:text-lime-400",
  3: "text-yellow-600 dark:text-yellow-400",
  2: "text-orange-600 dark:text-orange-400",
  1: "text-red-600 dark:text-red-400",
};

export function getLegKey(leg: RouteLeg): string {
  switch (leg.type) {
    case "WALK":
      return `walk-${leg.from}-${leg.to}-${leg.distanceM}`;
    case "BUS":
      return `bus-${leg.routeName}-${leg.departureStop}-${leg.arrivalStop}`;
    case "METRO":
      return `metro-${leg.lineName}-${leg.departureStation}-${leg.arrivalStation}`;
    case "THSR":
      return `thsr-${leg.trainNo}-${leg.departureStation}-${leg.arrivalStation}`;
    case "TRA":
      return `tra-${leg.trainNo}-${leg.departureStation}-${leg.arrivalStation}`;
    case "DRIVE":
    case "MOTORCYCLE":
      return `drive-${leg.from}-${leg.to}-${leg.distanceM}`;
    default:
      return `leg-${(leg as { type: string }).type}`;
  }
}
