import type { AirQuality } from "./air";

export type Step = {
  airDetail?: AirQuality;
} & google.maps.DirectionsStep;
