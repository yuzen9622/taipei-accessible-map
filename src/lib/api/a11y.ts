import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import type { IBathroom, Marker, metroA11yData } from "@/types";
import type { ApiResponse } from "@/types/response";
import type { AIChatResponse } from "@/types/transit";
import type {
  AccessibleRouteRequest,
  AccessibleRouteData,
  IntentResponse,
} from "@/types/route";

export async function getAllA11yPlaces() {
  const response = await fetchRequest<ApiResponse<null>>(
    `${END_POINT}/api/v1/a11y/all-places`
  );
  return response;
}

export async function getAllA11yBathrooms() {
  const response = await fetchRequest<ApiResponse<null>>(
    `${END_POINT}/api/v1/a11y/all-bathrooms`
  );
  return response as ApiResponse<IBathroom[]>;
}

export async function getNearbyRouteA11yPlaces(point: {
  lat: number;
  lng: number;
}) {
  const response = await fetchRequest<
    ApiResponse<{
      nearbyBathroom: IBathroom[];
      nearbyMetroA11y: metroA11yData[];
    }>
  >(`${END_POINT}/api/v1/a11y/nearby-a11y?lat=${point.lat}&lng=${point.lng}`);

  return response as ApiResponse<{
    nearbyBathroom: IBathroom[];
    nearbyMetroA11y: metroA11yData[];
  }>;
}

export async function getAccessibleRoute(request: AccessibleRouteRequest) {
  const response = await fetchRequest(
    `${END_POINT}/api/v1/a11y/accessible-route`,
    {
      method: "POST",
      body: request,
    }
  );
  return response as ApiResponse<AccessibleRouteData>;
}

export async function getRouteIntent(
  query: string,
  language?: string,
  lat?: number,
  lng?: number
) {
  const response = await fetchRequest(`${END_POINT}/api/v1/ai/intent`, {
    method: "POST",
    body: { query, language, lat, lng },
  });
  return response as ApiResponse<IntentResponse>;
}

export async function chatWithA11yAI(
  message: string,
  lang: string,
  lat?: number,
  lng?: number,
  history?: { role: string; parts: { text: string }[] }[]
) {
  const response = await fetchRequest(`${END_POINT}/api/v1/ai/chat`, {
    method: "POST",
    body: { message, lat, lng, history, lang },
  });
  return response as ApiResponse<AIChatResponse>;
}

export async function getOsmPlaceDetail(osmId: string) {
  const response = await fetchRequest(
    `${END_POINT}/api/v1/a11y/place?osmId=${osmId}`
  );
  return response;
}
