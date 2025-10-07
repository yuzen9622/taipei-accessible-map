import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { A11yEnum, type Marker, type metroA11yData } from "@/types";
import { ROUTE_COLORS } from "./config";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLocation(place: google.maps.places.Place) {
  if (!place.location) return null;

  return { lat: place.location?.lat(), lng: place.location?.lng() };
}

export function formatA11y(places: metroA11yData[]) {
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
