import type { AirQuality } from "@/types/air";
import { END_POINT } from "../config";
import { fetchRequest } from "../fetch";

export async function getWalkingAirQuality(lat: number, lng: number) {
  try {
    const response = await fetchRequest<AirQuality>(
      `${END_POINT}}/air/air-quality?lat=${lat}&lng=${lng}`
    );
    if (!response.ok) {
      throw new Error(response.message);
    }
    const airQuality = response.data;
    return airQuality as AirQuality;
  } catch {
    throw new Error("Failed to fetch air quality data");
  }
}
