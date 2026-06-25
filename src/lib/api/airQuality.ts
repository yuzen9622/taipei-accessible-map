import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import type { ApiResponse } from "@/types/response";
import type { AirQualityData } from "@/types/route";

export async function getAirQuality(lat: number, lng: number) {
  return fetchRequest(`${END_POINT}/api/v1/air/air-quality?lat=${lat}&lng=${lng}`) as Promise<ApiResponse<AirQualityData>>;
}
