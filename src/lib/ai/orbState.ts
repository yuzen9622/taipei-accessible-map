import type { OrbState } from "thinking-orbs";

const SEARCH_TOOLS = new Set([
  "findA11yPlaces",
  "findGooglePlaces",
  "findNearbyBusStops",
  "findNearbyParking",
  "webSearch",
  "searchAccessibilityGuide",
]);

const SOLVE_TOOLS = new Set([
  "planAccessibleRoute",
  "plan_route",
  "getNavInstructions",
]);

const WORK_TOOLS = new Set([
  "getBusRoute",
  "getBusRouteDetail",
  "getBusArrival",
  "getBusTimetable",
  "trackBuses",
  "getAirQuality",
  "getEnvironmentInfo",
  "getNearbyHazards",
  "getA11yFacilityDetails",
  "getCampusAccessibilityDetails",
  "findCampusAccessibility",
  "saveMemory",
  "deleteMemory",
]);

export function toolToOrbState(
  toolName: string | null | undefined,
): OrbState {
  if (!toolName) return "composing";
  if (SEARCH_TOOLS.has(toolName)) return "searching";
  if (SOLVE_TOOLS.has(toolName)) return "solving";
  if (WORK_TOOLS.has(toolName)) return "working";
  return "working";
}
