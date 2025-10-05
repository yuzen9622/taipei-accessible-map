import { useMapsLibrary } from "@vis.gl/react-google-maps";

import { useCallback, useState } from "react";
import useMapStore from "@/stores/useMapStore";

export default function useComputeRoute() {
  const [isLoading, setIsLoading] = useState(false);

  const { setComputeRoutes, map, setRouteSelect, setRouteInfoShow } =
    useMapStore();
  const Route = useMapsLibrary("routes");

  const computeRouteService = useCallback(
    async (
      origin: google.maps.LatLngLiteral,
      destination: google.maps.LatLngLiteral
    ) => {
      if (!Route || !map) return;
      setIsLoading(true);
      const { DirectionsService } = Route;
      const computeRouteService = new DirectionsService();
      const route = await computeRouteService.route({
        origin,
        destination,

        travelMode: google.maps.TravelMode.TRANSIT,
      });
      console.log("route", route);
      const data = route.routes;
      map.fitBounds(data[0].bounds);
      setComputeRoutes(data);
      setRouteSelect(data[0]);
      setIsLoading(false);
      setRouteInfoShow(true);
    },
    [Route, map, setComputeRoutes, setRouteSelect, setRouteInfoShow]
  );

  // const computeRoute = async (
  //   origin: google.maps.LatLngLiteral,
  //   destination: google.maps.LatLngLiteral
  // ): Promise<RoutesResponse> => {
  //   try {
  //     if (!map) throw new Error("Map is not initialized");
  //     setIsLoading(true);
  //     const ROUTES_API_ENDPOINT =
  //       "https://routes.googleapis.com/directions/v2:computeRoutes";
  //     const url = new URL(ROUTES_API_ENDPOINT);
  //     url.searchParams.set("fields", "*");
  //     const routeRequest = {
  //       origin: {
  //         location: { latLng: { longitude: origin.lng, latitude: origin.lat } },
  //       },
  //       destination: {
  //         location: {
  //           latLng: { longitude: destination.lng, latitude: destination.lat },
  //         },
  //       },
  //       travelMode: "TRANSIT",
  //       polylineQuality: "HIGH_QUALITY",
  //     };
  //     const response = await fetch(url, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || "",
  //       },
  //       body: JSON.stringify(routeRequest),
  //     });

  //     if (!response.ok) {
  //       throw new Error(
  //         `Request failed with status: ${response.status} - ${response.statusText}`
  //       );
  //     }
  //     const data = await response.json();
  //     console.log("Directions API response data:", data);
  //     const [route] = data.routes as Route[];
  //     setComputeRoutes(data.routes as Route[]);
  //     setRouteSelect(route);

  //     const { high, low } = route.viewport;
  //     const bounds: google.maps.LatLngBoundsLiteral = {
  //       north: high.latitude,
  //       south: low.latitude,
  //       east: high.longitude,
  //       west: low.longitude,
  //     };

  //     map.fitBounds(bounds);

  //     setIsLoading(false);
  //     return data;
  //   } catch (error) {
  //     setIsLoading(false);
  //     console.error("Error fetching directions:", error);
  //     throw error;
  //   }
  // };

  return { isLoading, computeRouteService };
}
