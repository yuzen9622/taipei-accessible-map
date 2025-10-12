import { useMapsLibrary } from "@vis.gl/react-google-maps";

import { useCallback, useState } from "react";
import { getNearbyRouteA11yPlaces } from "@/lib/api/a11y";

import { formatA11y } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

export default function useComputeRoute() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    setComputeRoutes,
    map,
    setRouteSelect,
    setRouteInfoShow,
    setRouteA11y,
    addRouteA11y,
    userLocation,
    travelMode,
  } = useMapStore();
  const Route = useMapsLibrary("routes");

  const computeA11yWalkingRoute = useCallback(
    async (point: google.maps.LatLng) => {
      const a11yPlaces = await getNearbyRouteA11yPlaces(point.toJSON());

      if (a11yPlaces.data) {
        addRouteA11y(formatA11y(a11yPlaces.data));
      }
    },
    [addRouteA11y]
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
        });

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

              computeA11yWalkingRoute(point);
            }
          }
        }

        const data = transitRoute.routes;
        console.log("route", data);
        map.fitBounds(data[0].bounds);
        setComputeRoutes(data);
        setRouteSelect({ index: 0, route: data[0] });
        setRouteInfoShow(true);
      } catch (error) {
        console.log(error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      Route,
      map,

      setComputeRoutes,
      setRouteSelect,
      setRouteInfoShow,
      computeA11yWalkingRoute,
      setRouteA11y,
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
      if (startLocation && endLocation) {
        computeRouteService(startLocation, endLocation, mode || travelMode);
      }
    },
    [userLocation, computeRouteService, travelMode]
  );

  return { isLoading, computeRouteService, handleComputeRoute };
}
