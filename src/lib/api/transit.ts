import type { ApiResponse } from "@/types/response";
import type { BusRealtimeNearbyStop } from "@/types/transit";
import { END_POINT } from "../config";
import { fetchRequest } from "../fetch";
import { lang } from "moment";

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
  const data = (await fetchRequest(`${END_POINT}/api/transit/bus`, {
    method: "POST",
    body: {
      arrival_stop,
      departure_stop,
      arrival_lat,
      arrival_lng,
      route_name,
      language: language==='en'?'En':'Zh_tw',
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
    `${END_POINT}/api/transit/bus/realtime?plate_number=${plate_number}&arrival_lat=${arrival_lat}&arrival_lng=${arrival_lng}&route_name=${route_name}`,
    {
      method: "GET",
      signal: controller.signal,
    }
  )) as ApiResponse<BusRealtimeNearbyStop[]>;

  clearTimeout(timeout);
  return data;
}

export async function getTrainData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const data = await fetchRequest(`${END_POINT}/api/transit/train`, {
    method: "GET",
    signal: controller.signal,
  });
  clearTimeout(timeout);
  return data;
}
