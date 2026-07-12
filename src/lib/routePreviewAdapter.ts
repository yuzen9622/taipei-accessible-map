import type { RoutePreviewLeg, RoutePreviewRoute } from "@/types/line";
import type { A11yLabel, AccessibleRoute, RouteLeg } from "@/types/route";

const A11Y_LABELS = new Set<A11yLabel>([
  "excellent",
  "good",
  "fair",
  "poor",
  "critical",
]);

function normalizeA11yLabel(label?: string | null): A11yLabel | undefined {
  if (!label) return undefined;
  return A11Y_LABELS.has(label as A11yLabel) ? (label as A11yLabel) : undefined;
}

function fallbackLabel(leg: RoutePreviewLeg) {
  if (leg.label) return leg.label;
  switch (leg.type) {
    case "WALK":
      return "步行";
    case "BUS":
      return "公車";
    case "METRO":
      return "捷運";
    case "THSR":
      return "高鐵";
    case "TRA":
      return "台鐵";
    case "DRIVE":
      return "開車";
    case "MOTORCYCLE":
      return "機車";
  }
}

function adaptPreviewLeg(leg: RoutePreviewLeg): RouteLeg {
  const label = fallbackLabel(leg);
  const from = leg.from ?? "";
  const to = leg.to ?? "";
  const durationMinutes = leg.durationMinutes ?? leg.durationMin ?? 0;
  const distanceM = leg.distanceM ?? 0;
  const polyline = leg.polyline ?? [];
  const waitInfo = { time: null, source: "unavailable" as const };

  switch (leg.type) {
    case "WALK":
      return {
        type: "WALK",
        from,
        to,
        distanceM,
        minutesEst: durationMinutes,
        polyline,
        a11yFacilities: [],
      };
    case "BUS":
      return {
        type: "BUS",
        routeName: label,
        departureStop: from,
        arrivalStop: to,
        departureTime: leg.departureTime ?? undefined,
        arrivalTime: leg.arrivalTime ?? undefined,
        waitInfo,
        estimatedWaitMinutes: 0,
        direction: 0,
        polyline,
        departureStopA11y: [],
        arrivalStopA11y: [],
      };
    case "METRO":
      return {
        type: "METRO",
        railSystem: "metro",
        lineId: label,
        lineName: label,
        lineUid: "",
        departureStation: from,
        arrivalStation: to,
        departureStationUid: "",
        arrivalStationUid: "",
        direction: 0,
        stopsCount: 0,
        rideMinutes: durationMinutes,
        departureTime: leg.departureTime ?? undefined,
        arrivalTime: leg.arrivalTime ?? undefined,
        waitInfo,
        estimatedWaitMinutes: 0,
        polyline,
        departureStationA11y: [],
        arrivalStationA11y: [],
        facilityHighlights: [],
      };
    case "THSR":
      return {
        type: "THSR",
        trainNo: label,
        departureStation: from,
        arrivalStation: to,
        departureStationUID: "",
        arrivalStationUID: "",
        departureTime: leg.departureTime ?? "",
        arrivalTime: leg.arrivalTime ?? "",
        rideMinutes: durationMinutes,
        waitInfo,
        estimatedWaitMinutes: 0,
        polyline,
        departureStationA11y: [],
        arrivalStationA11y: [],
        facilityHighlights: [],
      };
    case "TRA":
      return {
        type: "TRA",
        trainNo: label,
        trainTypeName: "",
        departureStation: from,
        arrivalStation: to,
        departureStationUID: "",
        arrivalStationUID: "",
        departureTime: leg.departureTime ?? "",
        arrivalTime: leg.arrivalTime ?? "",
        rideMinutes: durationMinutes,
        waitInfo,
        estimatedWaitMinutes: 0,
        polyline,
        departureStationA11y: [],
        arrivalStationA11y: [],
        facilityHighlights: [],
      };
    case "DRIVE":
    case "MOTORCYCLE":
      return {
        type: leg.type,
        label,
        from,
        to,
        distanceM,
        durationMinutes,
        durationMin: leg.durationMin ?? durationMinutes,
        departureTime: leg.departureTime,
        arrivalTime: leg.arrivalTime,
        polyline,
      };
  }
}

export function adaptRoutePreviewRoutes(
  routes: RoutePreviewRoute[],
): AccessibleRoute[] {
  return routes.map((route, index) => ({
    routeId: `line-preview-${index}`,
    routeName: route.routeName,
    totalMinutes: route.totalMinutes,
    transferCount: route.transferCount ?? 0,
    legs: route.legs.map(adaptPreviewLeg),
    accessibilityHighlights: route.accessibilityLabel
      ? [route.accessibilityLabel]
      : [],
    accessibilityScore: route.accessibilityScore ?? undefined,
    accessibilityLabel: normalizeA11yLabel(route.accessibilityLabel),
  }));
}
