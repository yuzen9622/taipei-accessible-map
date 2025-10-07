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
  } = useMapStore();
  const Route = useMapsLibrary("routes");

  const computeA11yWalkingRoute = useCallback(
    async (point: google.maps.LatLng) => {
      const a11yPlaces = await getNearbyRouteA11yPlaces(point.toJSON());
      // const waypoints = a11yPlaces.data
      //   ? [
      //       {
      //         location: point,
      //         stopover: true,
      //       },
      //     ]
      //   : undefined;

      if (a11yPlaces.data) {
        addRouteA11y(formatA11y(a11yPlaces.data));
      }

      // const walkingRoute = await computeRouteService.route({
      //   origin: start,
      //   destination: end,
      //   travelMode: google.maps.TravelMode.WALKING,
      //   waypoints,
      //   optimizeWaypoints: true,
      // });
      // const a11yLegs = walkingRoute.routes[0];
      // console.log("a11yLegs", a11yLegs, waypoints);
      // return a11yLegs;
    },
    [addRouteA11y]
  );

  const computeRouteService = useCallback(
    async (
      origin: google.maps.LatLngLiteral,
      destination: google.maps.LatLngLiteral
    ) => {
      if (!Route || !map) return;
      setIsLoading(true);
      setRouteA11y([]);
      const { DirectionsService } = Route;
      const computeRouteService = new DirectionsService();
      const transitRoute = await computeRouteService.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.TRANSIT,
      });

      // 2️⃣ 從 Transit 路線提取步行段

      const totalSteps: google.maps.DirectionsStep[] = [];

      for (const leg of transitRoute.routes[0].legs) {
        const steps = leg.steps;

        // 使用傳統 for 循環來獲取索引
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const prevStep = i > 0 ? steps[i - 1] : null;

          if (step.travel_mode === google.maps.TravelMode.WALKING) {
            // 判斷應該使用起點還是終點
            const useStartLocation =
              prevStep?.travel_mode === google.maps.TravelMode.TRANSIT;
            // const isSubway =
            //   nextStep?.transit?.line.vehicle.type ===
            //     google.maps.VehicleType.SUBWAY ||
            //   prevStep?.transit?.line.vehicle.type ===
            //     google.maps.VehicleType.SUBWAY;

            const point = useStartLocation
              ? step.start_location
              : step.end_location;

            await computeA11yWalkingRoute(point);
            // step.steps = walkingRoute.legs.flatMap((leg) => leg.steps);
            // step.encoded_lat_lngs = walkingRoute.overview_polyline;
            // step.path = walkingRoute.overview_path;
            // step.instructions = walkingRoute.summary;
            // if (walkingRoute) {
            //   totalSteps.push(...walkingRoute.legs.flatMap((leg) => leg.steps));
            // }
          }
          totalSteps.push(step);
        }
      }

      transitRoute.routes[0].legs[0].steps = totalSteps;
      const data = transitRoute.routes;
      console.log("route", data);
      map.fitBounds(data[0].bounds);
      setComputeRoutes(data);
      setRouteSelect(data[0]);
      setIsLoading(false);
      setRouteInfoShow(true);
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

  return { isLoading, computeRouteService };
}
