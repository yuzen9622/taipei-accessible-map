import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import type { ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLocation(place: google.maps.places.Place) {
  if (!place.location) return null;
  return { lat: place.location.lat(), lng: place.location.lng() };
}
