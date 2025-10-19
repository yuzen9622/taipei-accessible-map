import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import type { IBathroom, Marker, metroA11yData } from "@/types";
import type { ApiResponse } from "@/types/response";
import type { AIRouteResponse, RankRequest } from "@/types/transit";

export async function getAllA11yPlaces() {
  const response = await fetchRequest<ApiResponse<null>>(
    `${END_POINT}/api/a11y/all-places`
  );
  return response;
}

export async function getAllA11yBathrooms() {
  const response = await fetchRequest<ApiResponse<null>>(
    `${END_POINT}/api/a11y/all-bathrooms`
  );
  return response as ApiResponse<IBathroom[]>;
}

export async function getNearbyRouteA11yPlaces(point: {
  lat: number;
  lng: number;
}) {
  const response = await fetchRequest<
    ApiResponse<google.maps.DirectionsResult>
  >(`${END_POINT}/api/a11y/nearby-a11y?lat=${point.lat}&lng=${point.lng}`);

  return response as ApiResponse<{
    nearbyBathroom: IBathroom[];
    nearbyMetroA11y: metroA11yData[];
  }>;
}

export async function getBestRouteForA11y(
  request: {
    request: RankRequest[];
    a11ys: Marker[];
  }[]
) {
  const response = await fetchRequest(`${END_POINT}/api/a11y/route-select`, {
    method: "POST",
    body: request,
  });
  return response as ApiResponse<AIRouteResponse>;
}
