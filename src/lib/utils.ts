import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { A11yEnum, type Marker, type metroA11yData } from "@/types";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLocation(place: google.maps.places.Place) {
  if (!place.location) return null;

  return { lat: place.location?.lat(), lng: place.location?.lng() };
}

// 定義 API 回應的型別
interface DirectionsAPIResponse {
  routes: Array<{
    bounds: {
      southwest: { lat: number; lng: number };
      northeast: { lat: number; lng: number };
    };
    legs: Array<{
      start_location: { lat: number; lng: number };
      end_location: { lat: number; lng: number };
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      steps: Array<{
        start_location: { lat: number; lng: number };
        end_location: { lat: number; lng: number };
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        html_instructions: string;
        maneuver?: string;
        polyline?: { points: string };
        travel_mode: string;
        transit?: any;
      }>;
    }>;
  }>;
  status: string;
}

// 轉換後的型別
interface ConvertedDirectionsResult {
  routes: google.maps.DirectionsRoute[];
  status: string;
}

export function convertDirectionsAPIToResult(
  apiResult: DirectionsAPIResponse
): ConvertedDirectionsResult {
  // 檢查是否有路線
  if (!apiResult.routes || apiResult.routes.length === 0) {
    return {
      routes: [],
      status: apiResult.status || "ZERO_RESULTS",
    };
  }

  try {
    const routes = apiResult.routes.map((route) => {
      const { southwest: sw, northeast: ne } = route.bounds;

      // 創建邊界
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(sw.lat, sw.lng),
        new google.maps.LatLng(ne.lat, ne.lng)
      );

      // 轉換 legs
      const legs = route.legs.map((leg) => {
        // 轉換 steps
        const steps = leg.steps.map((step) => ({
          start_location: new google.maps.LatLng(
            step.start_location.lat,
            step.start_location.lng
          ),
          end_location: new google.maps.LatLng(
            step.end_location.lat,
            step.end_location.lng
          ),
          distance: step.distance,
          duration: step.duration,
          instructions: step.html_instructions,
          maneuver: step.maneuver || undefined,
          polyline: step.polyline || undefined,
          travel_mode: step.travel_mode as google.maps.TravelMode,
          transit: step.transit,
        })) as google.maps.DirectionsStep[];

        return {
          start_location: new google.maps.LatLng(
            leg.start_location.lat,
            leg.start_location.lng
          ),
          end_location: new google.maps.LatLng(
            leg.end_location.lat,
            leg.end_location.lng
          ),
          distance: leg.distance,
          duration: leg.duration,
          steps,
        } as google.maps.DirectionsLeg;
      });

      return {
        bounds,
        legs,
      } as google.maps.DirectionsRoute;
    });

    return {
      routes,
      status: apiResult.status,
    };
  } catch (error) {
    console.error("Error converting directions API result:", error);
    return {
      routes: [],
      status: "CONVERSION_ERROR",
    };
  }
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
