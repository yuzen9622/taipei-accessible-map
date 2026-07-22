import { a11yPlacesToMarkers, googlePlacesToMarkers } from "@/lib/aiResults";
import type { LatLng } from "@/types";
import type { UIAction } from "./uiAction";

export function mapToolToActions(
  toolName: string,
  result: unknown,
  args?: unknown,
): UIAction[] {
  switch (toolName) {
    case "findA11yPlaces":
      return [{ type: "show-markers", markers: a11yPlacesToMarkers(result) }];

    case "findGooglePlaces":
      return [{ type: "show-markers", markers: googlePlacesToMarkers(result) }];

    case "plan_route":
    case "planAccessibleRoute":
      return mapRouteResult(result, args);

    default:
      return [];
  }
}

function extractLatLng(
  primary: unknown,
  fallback: unknown,
): LatLng | null {
  for (const src of [primary, fallback]) {
    if (!src || typeof src !== "object") continue;
    const o = src as Record<string, unknown>;
    const lat = (o.lat ?? o.latitude) as number | undefined;
    const lng = (o.lng ?? o.longitude) as number | undefined;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat: lat!, lng: lng! };
    }
  }
  return null;
}

function mapRouteResult(result: unknown, args: unknown): UIAction[] {
  const res = (result ?? {}) as Record<string, any>;
  const parsed = (() => {
    if (typeof args === "string") {
      try { return JSON.parse(args || "{}"); } catch { return {}; }
    }
    return args ?? {};
  })() as Record<string, any>;

  const origin = extractLatLng(res.origin, parsed.origin);
  const destination = extractLatLng(res.destination, parsed.destination);

  const aiRoutes = res.routes;
  const drawable =
    Array.isArray(aiRoutes) &&
    aiRoutes.length > 0 &&
    aiRoutes.some((r: any) =>
      r?.legs?.some((l: any) => l?.polyline?.length),
    );

  const actions: UIAction[] = [];

  if (drawable && origin && destination) {
    actions.push({
      type: "show-route",
      origin,
      destination,
      routes: aiRoutes,
    });
    actions.push({ type: "switch-panel", sheet: "route" });
  } else if (origin && destination) {
    actions.push({ type: "compute-route", origin, destination });
    actions.push({ type: "switch-panel", sheet: "route" });
  } else if (Array.isArray(aiRoutes) && aiRoutes.length > 0) {
    actions.push({
      type: "show-route",
      origin: extractLatLng(res.origin, null) ?? { lat: 0, lng: 0 },
      destination: extractLatLng(res.destination, null) ?? { lat: 0, lng: 0 },
      routes: aiRoutes,
    });
    actions.push({ type: "switch-panel", sheet: "route" });
  }

  return actions;
}
