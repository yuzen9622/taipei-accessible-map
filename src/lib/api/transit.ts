import type { ApiResponse } from "@/types/response";
import type { BusRealtimeNearbyStop } from "@/types/transit";
import type { EstimatedTimeOfArrival, RealTimeByFrequency } from "@/types/route";
import { END_POINT } from "../config";
import { fetchRequest } from "../fetch";

export async function getBusRealtimeNearbyStop({
  arrival_stop,
  departure_stop,
  arrival_lat,
  arrival_lng,
  route_name,
  language,
}: {
  arrival_stop: string;
  departure_stop: string;
  arrival_lat: number;
  arrival_lng: number;
  language: string;
  route_name: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(`${END_POINT}/api/v1/transit/bus`, {
    method: "POST",
    body: {
      arrival_stop,
      departure_stop,
      arrival_lat,
      arrival_lng,
      route_name,
      language: language === "en" ? "En" : "Zh_tw",
    },
    signal: controller.signal,
  })) as ApiResponse<BusRealtimeNearbyStop[]>;
  clearTimeout(timeout);
  return data;
}

export async function getRealtimeBusPosition(
  plate_number: string,
  arrival_lat: number,
  arrival_lng: number,
  route_name: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/realtime?plate_number=${plate_number}&arrival_lat=${arrival_lat}&arrival_lng=${arrival_lng}&route_name=${route_name}`,
    {
      method: "GET",
      signal: controller.signal,
    }
  )) as ApiResponse<BusRealtimeNearbyStop[]>;

  clearTimeout(timeout);
  return data;
}

export async function getBusArrival(
  routeName?: string,
  stopName?: string,
  direction?: 0 | 1
) {
  const params = new URLSearchParams();
  if (routeName) params.set("route_name", routeName);
  if (stopName) params.set("stop_name", stopName);
  if (direction !== undefined) params.set("direction", String(direction));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/arrival?${params}`,
    { signal: controller.signal }
  )) as ApiResponse<EstimatedTimeOfArrival[]>;
  clearTimeout(timeout);
  return data;
}

export async function getBusPositions(
  routeName: string,
  direction?: 0 | 1
) {
  const params = new URLSearchParams({ route_name: routeName });
  if (direction !== undefined) params.set("direction", String(direction));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/positions?${params}`,
    { signal: controller.signal }
  )) as ApiResponse<RealTimeByFrequency[]>;
  clearTimeout(timeout);
  return data;
}

export async function getTrainData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = await fetchRequest(`${END_POINT}/api/v1/transit/train`, {
    method: "GET",
    signal: controller.signal,
  });
  clearTimeout(timeout);
  return data;
}
