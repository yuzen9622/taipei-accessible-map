import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  A11yEnum,
  type IBathroom,
  type Marker,
  type metroA11yData,
} from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMetroA11y(places: metroA11yData[]) {
  return places.map((place) => {
    const { _id, osmId, 經度, 緯度 } = place;
    const name = place["出入口電梯/無障礙坡道名稱"] ?? "";
    const a11yType = name.includes("電梯") ? A11yEnum.ELEVATOR : A11yEnum.RAMP;

    return {
      id: _id ?? osmId,
      position: {
        lat: parseFloat(String(緯度)),
        lng: parseFloat(String(經度)),
      },
      type: "pin",
      content: {
        title: name,
        desc: place.出入口編號 ?? "",
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
