import type { ApiResponse } from "@/types/response";
import type { BusRealtimeNearbyStop } from "@/types/transit";
import type { RealTimeByFrequency } from "@/types/route";
import { END_POINT } from "../config";
import { fetchRequest } from "../fetch";

// --- Types for the bus arrival API (matches real backend response) ---

export interface BusArrivalItem {
  stopName: string;
  direction: 0 | 1;
  directionLabel: string;
  estimateMinutes: number;
  statusLabel: string;
  plateNumb?: string;
}

export interface BusArrivalData {
  routeName: string;
  city: string;
  stopName: string;
  arrivals: BusArrivalItem[];
}

// --- Types for new bus endpoints (not yet deployed) ---

export interface BusRouteSearchResult {
  routeName: string;
  routeId?: string;
  departureStop?: string;
  destinationStop?: string;
  city?: string;
}

export interface BusRouteStop {
  stopName: string;
  stopId?: string;
  sequence?: number;
  latitude?: number;
  longitude?: number;
}

export interface NearbyBusStop {
  stopName: string;
  stopId?: string;
  latitude: number;
  longitude: number;
  distance: number;
  routes?: string[];
}

// --- Existing endpoints ---

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
  routeName: string,
  stopName: string,
  city = "台北",
  direction?: 0 | 1
) {
  const params = new URLSearchParams({ routeName, stopName, city });
  if (direction !== undefined) params.set("direction", String(direction));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/arrival?${params}`,
    { signal: controller.signal }
  )) as ApiResponse<BusArrivalData>;
  clearTimeout(timeout);
  return data;
}

export async function getBusPositions(
  routeName: string,
  city = "台北",
  direction?: 0 | 1
) {
  const params = new URLSearchParams({ routeName, city });
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

// --- New endpoints (stubs — backend not yet deployed) ---

export async function searchBusRoutes(keyword: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/search-routes?keyword=${encodeURIComponent(keyword)}`,
    { signal: controller.signal }
  )) as ApiResponse<BusRouteSearchResult[]>;
  clearTimeout(timeout);
  return data;
}

export async function getBusRouteStops(
  routeName: string,
  city = "台北",
  direction?: 0 | 1
) {
  const params = new URLSearchParams({ routeName, city });
  if (direction !== undefined) params.set("direction", String(direction));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/route-stops?${params}`,
    { signal: controller.signal }
  )) as ApiResponse<BusRouteStop[]>;
  clearTimeout(timeout);
  return data;
}

export async function getNearbyBusStops(lat: number, lng: number, radius?: number) {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radius !== undefined) params.set("radius", String(radius));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = (await fetchRequest(
    `${END_POINT}/api/v1/transit/bus/nearby-stops?${params}`,
    { signal: controller.signal }
  )) as ApiResponse<NearbyBusStop[]>;
  clearTimeout(timeout);
  return data;
}
