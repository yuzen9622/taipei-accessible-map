import { useState } from "react";

import useMapStore from "@/stores/useMapStore";

import type { RoutesResponse } from "@/types/route.t";
export default function useComputeRoute() {
  const [isLoading, setIsLoading] = useState(false);

  const { setComputeRoute, map } = useMapStore();
  const computeRoute = async (
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral
  ): Promise<RoutesResponse> => {
    try {
      if (!map) throw new Error("Map is not initialized");
      setIsLoading(true);
      const ROUTES_API_ENDPOINT =
        "https://routes.googleapis.com/directions/v2:computeRoutes";
      const url = new URL(ROUTES_API_ENDPOINT);
      url.searchParams.set("fields", "*");
      const routeRequest = {
        origin: {
          location: { latLng: { longitude: origin.lng, latitude: origin.lat } },
        },
        destination: {
          location: {
            latLng: { longitude: destination.lng, latitude: destination.lat },
          },
        },
        travelMode: "TRANSIT",
        computeAlternativeRoutes: true,
        polylineQuality: "HIGH_QUALITY",
      };
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || "",
        },
        body: JSON.stringify(routeRequest),
      });

      if (!response.ok) {
        throw new Error(
          `Request failed with status: ${response.status} - ${response.statusText}`
        );
      }
      const data = await response.json();
      console.log("Directions API response data:", data);
      const [route] = data.routes;
      setComputeRoute(route);
      const { high, low } = route.viewport;
      const bounds: google.maps.LatLngBoundsLiteral = {
        north: high.latitude,
        south: low.latitude,
        east: high.longitude,
        west: low.longitude,
      };

      map.fitBounds(bounds);

      setIsLoading(false);
      return data;
    } catch (error) {
      setIsLoading(false);
      console.error("Error fetching directions:", error);
      throw error;
    }
  };

  return { computeRoute, isLoading };
}
