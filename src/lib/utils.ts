import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  A11yEnum,
  type IBathroom,
  type Marker,
  type metroA11yData,
} from "@/types";
import type { RankRequest } from "@/types/transit";
import { ROUTE_COLORS } from "./config";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLocation(place: google.maps.places.Place) {
  if (!place.location) return null;

  return { lat: place.location?.lat(), lng: place.location?.lng() };
}

export function formatMetroA11y(places: metroA11yData[]) {
  return places.map((place) => {
    const { _id, 經度, 緯度 } = place;
    const a11yType = place["出入口電梯/無障礙坡道名稱"].includes("電梯")
      ? A11yEnum.ELEVATOR
      : A11yEnum.RAMP;

    return {
      id: _id,
      position: { lat: parseFloat(緯度), lng: parseFloat(經度) },
      type: "pin",
      content: {
        title: place["出入口電梯/無障礙坡道名稱"],
        desc: place["出入口編號"],
      },
      zIndex: 1,
      a11yType,
    };
  }) as Marker[];
}

export function formatBathroom(bathrooms: IBathroom[]) {
  return bathrooms.map((bathroom) => {
    const { _id, latitude, longitude, name, diaper } = bathroom;

    return {
      id: _id,
      position: { lat: latitude, lng: longitude },
      type: "pin",
      content: {
        title: name,
        desc: diaper ? "有提供尿布台" : "無提供尿布台",
      },
      zIndex: 1,
      a11yType: A11yEnum.RESTROOM,
    };
  }) as Marker[];
}

type SupportedVehicleType = keyof typeof ROUTE_COLORS;

export function getStepColor(step: google.maps.DirectionsStep): string {
  const isWalking = step.travel_mode === google.maps.TravelMode.WALKING;

  if (isWalking) {
    return ROUTE_COLORS.walking;
  }

  // 使用交通工具的自訂顏色或預設顏色
  const vehicleType = step.transit?.line?.vehicle?.type;
  const customColor = step.transit?.line?.color;

  if (customColor) {
    return customColor;
  }

  if (vehicleType && vehicleType in ROUTE_COLORS)
    return ROUTE_COLORS[vehicleType as SupportedVehicleType];

  return ROUTE_COLORS.default;
}
export const formatRouteForAI = (
  route: google.maps.DirectionsRoute,
  a11ys: Marker[]
) => {
  const request: RankRequest[] = [];
  route.legs[0].steps.forEach((step) => {
    request.push({
      start: step.start_location.toJSON(),
      end: step.end_location.toJSON(),
      instructions: step.instructions.replaceAll(/<[^>]+>/g, ""),
      duration: step.duration?.value || 0,
      a11y: a11ys,
      line: step.transit?.line,
    });
  });
  return request;
};
