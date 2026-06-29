import type { ApiResponse } from "@/types/response";
import type { BusRealtimeNearbyStop, BusSearchResult } from "@/types/transit";
import type {
  EstimatedTimeOfArrival,
  RealTimeByFrequency,
} from "@/types/route";
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
  route_name: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/realtime?plate_number=${plate_number}&arrival_lat=${arrival_lat}&arrival_lng=${arrival_lng}&route_name=${route_name}`,
    {
      method: "GET",
      signal: controller.signal,
    },
  )) as ApiResponse<BusRealtimeNearbyStop[]>;

  clearTimeout(timeout);
  return data;
}

export async function getBusArrival(
  routeName?: string,
  stopName?: string,
  direction?: 0 | 1,
  city?: string,
) {
  const params = new URLSearchParams();
  if (routeName) params.set("routeName", routeName);
  if (stopName) params.set("stopName", stopName);
  if (direction !== undefined) params.set("direction", String(direction));
  if (city) params.set("city", city);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/arrival?${params}`,
    { signal: controller.signal },
  )) as ApiResponse<{
    routeName: string;
    city: string;
    stopName: string;
    arrivals: BusArrivalItem[];
  }>;
  clearTimeout(timeout);
  return data;
}

export interface BusArrivalItem {
  stopName: string;
  direction: 0 | 1;
  directionLabel: string;
  estimateMinutes: number | null;
  statusLabel: string;
}

export async function getBusPositions(routeName: string, direction?: 0 | 1) {
  const params = new URLSearchParams({ route_name: routeName });
  if (direction !== undefined) params.set("direction", String(direction));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/positions?${params}`,
    { signal: controller.signal },
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

export async function searchBusRoutes(keyword: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/search-routes?keyword=${encodeURIComponent(keyword)}`,
    { signal: controller.signal },
  )) as ApiResponse<{ routes: BusSearchResult[] }>;
  clearTimeout(timeout);
  return data;
}

export interface RouteDetailStop {
  seq: number;
  name: string;
  lat: number;
  lng: number;
  estimateMinutes: number | null;
  statusLabel: string;
}

export interface RouteDetailDirection {
  direction: 0 | 1;
  stops: RouteDetailStop[];
}

export async function getBusRouteDetail(routeName: string, city: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/route-detail?routeName=${encodeURIComponent(routeName)}&city=${encodeURIComponent(city)}`,
    { signal: controller.signal },
  )) as ApiResponse<{ directions: RouteDetailDirection[] }>;
  clearTimeout(timeout);
  return data;
}
