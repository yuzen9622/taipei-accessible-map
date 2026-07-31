/**
 * The user's accessibility needs profile, collected during first-run onboarding
 * and editable afterwards.
 *
 * Two layers on purpose:
 *
 * - `situations` is what we actually ask the user (six checkboxes, multi-select).
 *   It drives frontend behaviour only: which facility categories to show by
 *   default, how to order fields in place details, what the home screen's
 *   contextual block suggests, and what context the AI assistant gets.
 * - `routeMode` is the single four-value enum the backend route API accepts
 *   (`POST /api/v1/a11y/accessible-route`). It is *derived* from `situations`
 *   because the backend has no concept of a walker or a stroller, and it stays
 *   overridable so the derivation can never silently route someone wrong.
 */

import { A11yEnum } from "@/types";

/** Mirrors the `mode` field of the backend accessible-route request. */
export type A11yRouteMode =
  | "normal"
  | "wheelchair"
  | "elderly"
  | "visual_impaired";

/** The six options offered in onboarding step 2. */
export type A11ySituation =
  | "wheelchair"
  | "walker"
  | "vision"
  | "slow"
  | "stroller"
  | "companion";

export const A11Y_SITUATIONS: A11ySituation[] = [
  "wheelchair",
  "walker",
  "vision",
  "slow",
  "stroller",
  "companion",
];

export interface A11yProfile {
  situations: A11ySituation[];
  /** Sent to the backend as `mode`. */
  routeMode: A11yRouteMode;
  /**
   * While true, `routeMode` tracks `situations` through `deriveRouteMode`.
   * Set to false once the user picks a mode by hand, so their choice survives
   * later edits to `situations`.
   */
  routeModeAuto: boolean;
  /** Frontend-only routing preferences; no backend field exists for these yet. */
  avoidStairs: boolean;
  requireElevator: boolean;
  /**
   * Same contract as `routeModeAuto`, for the two step-free flags: while true
   * they follow `situations`, so de-selecting "wheelchair" correctly relaxes
   * them again. Turning a flag on or off by hand pins both.
   */
  stepFreeFlagsAuto: boolean;
}

export const DEFAULT_A11Y_PROFILE: A11yProfile = {
  situations: [],
  routeMode: "normal",
  routeModeAuto: true,
  avoidStairs: false,
  requireElevator: false,
  stepFreeFlagsAuto: true,
};

/**
 * Collapse the multi-select situations into the one mode the backend accepts.
 *
 * Precedence is step-free need first, then vision, then pace. A wheelchair
 * user who is also blind gets `wheelchair`, because a route with stairs is
 * impassable for them while a route without audio cues is merely harder — the
 * physical constraint has to win. Anyone who disagrees with the result can
 * override it, which is why `routeModeAuto` exists.
 */
export function deriveRouteMode(situations: A11ySituation[]): A11yRouteMode {
  if (
    situations.includes("wheelchair") ||
    situations.includes("walker") ||
    situations.includes("stroller")
  ) {
    return "wheelchair";
  }
  if (situations.includes("vision")) return "visual_impaired";
  if (situations.includes("slow")) return "elderly";
  return "normal";
}

/** Situations that imply the user cannot take stairs at all. */
export function impliesStepFree(situations: A11ySituation[]): boolean {
  return (
    situations.includes("wheelchair") ||
    situations.includes("walker") ||
    situations.includes("stroller")
  );
}

/**
 * Facility categories to pre-select on the map for a given profile. Keys match
 * the `category` values used by `getAllA11yFacilities` (`elevator,ramp,toilet`).
 */
export function defaultFacilityCategories(
  situations: A11ySituation[],
): ("elevator" | "ramp" | "toilet")[] {
  if (situations.length === 0) return ["elevator", "ramp", "toilet"];
  const categories = new Set<"elevator" | "ramp" | "toilet">();
  if (impliesStepFree(situations)) {
    categories.add("elevator");
    categories.add("ramp");
  }
  if (situations.includes("wheelchair") || situations.includes("slow")) {
    categories.add("toilet");
  }
  if (situations.includes("vision") || situations.includes("companion")) {
    categories.add("elevator");
    categories.add("toilet");
  }
  return categories.size > 0 ? [...categories] : ["elevator", "ramp", "toilet"];
}

/**
 * `defaultFacilityCategories` speaks the `category` values the facilities API
 * uses; the map layer's filter state and pin markers speak `A11yEnum`. Shared
 * so onboarding's filter pre-select and the home screen's "你附近" block
 * don't each carry their own copy of this mapping.
 */
export const FACILITY_CATEGORY_TO_A11Y_ENUM: Record<
  "elevator" | "ramp" | "toilet",
  A11yEnum
> = {
  elevator: A11yEnum.ELEVATOR,
  ramp: A11yEnum.RAMP,
  toilet: A11yEnum.RESTROOM,
};

/** i18n key of the existing label for each backend route mode. */
export const ROUTE_MODE_LABEL_KEY: Record<A11yRouteMode, string> = {
  normal: "normalMode",
  wheelchair: "wheelchairMode",
  elderly: "elderlyMode",
  visual_impaired: "visualImpairedMode",
};

/**
 * i18n keys for the one-line profile summary shown above route results, so the
 * onboarding answers visibly pay off ("依你的設定：輪椅 · 避開階梯 · 需電梯").
 * Reuses the mode labels that already exist in the translation files.
 */
export function profileSummaryKeys(profile: A11yProfile): string[] {
  const keys = [ROUTE_MODE_LABEL_KEY[profile.routeMode]];
  if (profile.avoidStairs) keys.push("profileAvoidStairs");
  if (profile.requireElevator) keys.push("profileRequireElevator");
  return keys;
}

/** Labels for the six situations, used where the i18n key isn't worth a round-trip (AI prompt text). */
const SITUATION_LABEL: Record<"zh-TW" | "en", Record<A11ySituation, string>> = {
  "zh-TW": {
    wheelchair: "輪椅使用者",
    walker: "使用助行器",
    vision: "視覺障礙",
    slow: "行動較慢／長者",
    stroller: "推嬰兒車",
    companion: "有陪同者",
  },
  en: {
    wheelchair: "wheelchair user",
    walker: "walker/mobility-aid user",
    vision: "visually impaired",
    slow: "slower pace / elderly",
    stroller: "pushing a stroller",
    companion: "traveling with a companion",
  },
};

/**
 * One-line, plain-language description of the user's profile for the AI
 * assistant's system prompt — not shown to the user, so it doesn't need i18n
 * keys, just needs to bias the assistant's answers (e.g. don't suggest stairs
 * to a wheelchair user). Returns null when the user never set a profile, so
 * the prompt doesn't claim a preference nobody stated. `language` mirrors the
 * same `userConfig.language` check the caller already uses to pick the reply
 * language, so this note doesn't switch languages mid-prompt.
 */
export function describeProfileForAssistant(
  profile: A11yProfile,
  language: "zh-TW" | "en" = "zh-TW",
): string | null {
  if (profile.situations.length === 0) return null;
  const labelMap = SITUATION_LABEL[language];
  const labels = profile.situations.map((s) => labelMap[s]);
  if (language === "en") {
    const parts = [`User's accessibility needs: ${labels.join(", ")}.`];
    if (profile.avoidStairs)
      parts.push("Avoid stairs; prefer routes with elevators or ramps.");
    if (profile.requireElevator)
      parts.push("Destination or transfer points must have an elevator.");
    return parts.join(" ");
  }
  const parts = [`使用者的無障礙需求：${labels.join("、")}。`];
  if (profile.avoidStairs)
    parts.push("請避開樓梯，優先推薦有電梯或坡道的路徑。");
  if (profile.requireElevator) parts.push("目的地或轉乘點需要有電梯。");
  return parts.join("");
}

/**
 * Priority order for the place-detail accessibility checklist: whichever
 * facility the user's situations most depend on should surface first, instead
 * of the fixed wheelchair→elevator→ramp→toilet→tactile order that ignores who
 * is actually asking.
 */
export function checklistPriorityOrder(situations: A11ySituation[]): string[] {
  const order: string[] = [];
  if (impliesStepFree(situations)) order.push("elevator", "ramp");
  if (situations.includes("vision")) order.push("tactile");
  if (
    situations.includes("wheelchair") ||
    situations.includes("slow") ||
    situations.includes("vision")
  ) {
    order.push("toilet");
  }
  order.push("wheelchair", "elevator", "ramp", "toilet", "tactile");
  return [...new Set(order)];
}
