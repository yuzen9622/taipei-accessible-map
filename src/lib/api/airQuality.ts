import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import type { ApiResponse } from "@/types/response";
import type { AirQuality } from "@/types/route";

export async function getAirQuality(lat: number, lng: number) {
  return fetchRequest(`${END_POINT}/air/air-quality?lat=${lat}&lng=${lng}`) as Promise<ApiResponse<AirQuality>>;
}
