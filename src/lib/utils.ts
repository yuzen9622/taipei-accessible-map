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

export async function getGeocoder(location: google.maps.LatLngLiteral) {
  const geocoder = new google.maps.Geocoder();
  const geocodeResult = await geocoder.geocode({
    location,
  });
  return geocodeResult.results[0];
}
