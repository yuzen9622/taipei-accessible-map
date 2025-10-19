import { useMapsLibrary } from "@vis.gl/react-google-maps";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getBestRouteForA11y, getNearbyRouteA11yPlaces } from "@/lib/api/a11y";
import { formatBathroom, formatMetroA11y, formatRouteForAI } from "@/lib/utils";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import type { Marker } from "@/types";
import { useRouteRank } from "./useRouteRank";

export default function useComputeRoute() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    setComputeRoutes,
    map,
    setRouteSelect,
    setRouteInfoShow,
    setRouteA11y,
    userLocation,
    travelMode,
  } = useMapStore();
  const { getRouteRank } = useRouteRank();
  const { userConfig } = useAuthStore();
  const Route = useMapsLibrary("routes");

  const computeA11yWalkingRoute = useCallback(
    async (point: google.maps.LatLng) => {
      const a11yPlaces = await getNearbyRouteA11yPlaces(point.toJSON());

      if (a11yPlaces.data) {
        const metroA11y = formatMetroA11y(a11yPlaces.data.nearbyMetroA11y);
        const bathroomA11y = formatBathroom(a11yPlaces.data.nearbyBathroom);
        return [...metroA11y, ...bathroomA11y];
      }
    },
    []
  );

  const computeRouteService = useCallback(
    async (
      origin: google.maps.LatLngLiteral,
      destination: google.maps.LatLngLiteral,
      travelMode: google.maps.TravelMode = google.maps.TravelMode.TRANSIT
    ) => {
      if (!Route || !map) return;
      try {
        setIsLoading(true);
        setRouteA11y([]);
        const { DirectionsService } = Route;
        const computeRouteService = new DirectionsService();
        const transitRoute = await computeRouteService.route({
          origin,
          destination,
          travelMode,
          provideRouteAlternatives: true,
          language: userConfig.language,
        });
        const allRouteA11y: Marker[] = [];
        for (let j = 0; j < transitRoute.routes[0].legs.length; j++) {
          const steps = transitRoute.routes[0].legs[j].steps;

          // 使用傳統 for 循環來獲取索引
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const prevStep = i > 0 ? steps[i - 1] : null;

            if (step.travel_mode === google.maps.TravelMode.WALKING) {
              // 判斷應該使用起點還是終點
              const useStartLocation =
                prevStep?.travel_mode === google.maps.TravelMode.TRANSIT;

              const point = useStartLocation
                ? step.start_location
                : step.end_location;

              const a11y = await computeA11yWalkingRoute(point);
              if (a11y) {
                allRouteA11y.push(...a11y);
              }
            }
          }
        }

        const data = transitRoute.routes;
        getRouteRank(data[0], allRouteA11y);

        map.fitBounds(data[0].bounds);
        setComputeRoutes(data);
        const request = data.map((route) =>
          formatRouteForAI(route, allRouteA11y)
        );
        console.log("Route request for AI:", request);
        const aiResponse = await getBestRouteForA11y(request);
        setRouteSelect({
          index: 0,
          route: aiResponse.data ? data[aiResponse.data.route_index] : data[0],
        });
        setRouteInfoShow(true);
        setRouteA11y(allRouteA11y);
      } catch (error) {
        console.log(error);
        toast.error("路徑規劃失敗，請稍後再試");
      } finally {
        setIsLoading(false);
      }
    },
    [
      Route,
      map,
      getRouteRank,
      setComputeRoutes,
      setRouteSelect,
      setRouteInfoShow,
      computeA11yWalkingRoute,
      setRouteA11y,
      userConfig.language,
    ]
  );

  const handleComputeRoute = useCallback(
    async (params: {
      origin?: google.maps.LatLngLiteral;
      destination?: google.maps.LatLngLiteral;
      mode?: google.maps.TravelMode;
    }) => {
      const { origin, destination, mode } = params;
      if (!origin && !destination) return;
      const startLocation = origin || userLocation;
      const endLocation = destination || userLocation;
      console.log(startLocation, endLocation);
      if (startLocation && endLocation) {
        await computeRouteService(
          startLocation,
          endLocation,
          mode || travelMode
        );
      }
    },
    [userLocation, computeRouteService, travelMode]
  );

  return { isLoading, computeRouteService, handleComputeRoute };
}
