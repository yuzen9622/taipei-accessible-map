import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import type { metroA11yData } from "@/types";
import type { ApiResponse } from "@/types/response";

export async function getAllA11yPlaces() {
  const response = await fetchRequest<ApiResponse<null>>(
    `${END_POINT}/api/a11y/`
  );
  return response;
}

export async function getNearbyRouteA11yPlaces(point: {
  lat: number;
  lng: number;
}) {
  const response = await fetchRequest<
    ApiResponse<google.maps.DirectionsResult>
  >(`${END_POINT}/api/a11y/nearby-a11y?lat=${point.lat}&lng=${point.lng}`);

  return response as ApiResponse<metroA11yData[]>;
}
