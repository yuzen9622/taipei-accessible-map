import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import type { IBathroom, metroA11yData } from "@/types";
import type { ApiResponse } from "@/types/response";
import type { AccessibleRouteData, OsmA11y, RouteIntent } from "@/types/route";

export async function getAllA11yPlaces() {
  return fetchRequest(`${END_POINT}/a11y/all-places`) as Promise<ApiResponse<metroA11yData[]>>;
}

export async function getAllA11yBathrooms() {
  return fetchRequest(`${END_POINT}/a11y/all-bathrooms`) as Promise<ApiResponse<IBathroom[]>>;
}

export async function getNearbyRouteA11yPlaces(point: { lat: number; lng: number }) {
  return fetchRequest(`${END_POINT}/a11y/nearby-a11y?lat=${point.lat}&lng=${point.lng}`) as Promise<ApiResponse<{ nearbyMetroA11y: metroA11yData[]; nearbyBathroom: IBathroom[]; nearbyOsm: OsmA11y[] }>>;
}

export async function getOsmPlaceDetail(osmIds: string | string[]) {
  const ids = Array.isArray(osmIds) ? osmIds.join(",") : osmIds;
  return fetchRequest(`${END_POINT}/a11y/place?osmId=${encodeURIComponent(ids)}`) as Promise<ApiResponse<OsmA11y[]>>;
}

export type AccessibleRouteRequest = {
  origin?: string | { latitude: number; longitude: number };
  destination?: string | { latitude: number; longitude: number };
  query?: string;
  userLocation?: { latitude: number; longitude: number };
  mode?: RouteIntent["mode"];
  maxTransfers?: number;
  departureTime?: string;
  format?: "standard" | "compact";
};

export async function getAccessibleRoute(request: AccessibleRouteRequest) {
  return fetchRequest(`${END_POINT}/a11y/accessible-route`, { method: "POST", body: request }) as Promise<ApiResponse<AccessibleRouteData>>;
}
