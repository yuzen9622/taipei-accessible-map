import { LngLatBounds } from "maplibre-gl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getAccessibleRoute } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import useStatusStore from "@/stores/useStatusStore";
import type { LatLng } from "@/types";

export default function useComputeRoute() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    setComputeRoutes,
    map,
    setRouteSelect,
    setRouteInfoShow,
    userLocation,
    closeRouteDrawer,
  } = useMapStore();

  const computeRoute = useCallback(
    async (params: {
      origin?: LatLng;
      destination?: LatLng;
      query?: string;
    }): Promise<boolean> => {
      const { origin, destination, query } = params;

      if (!query && !origin && !destination) return false;

      const startLocation = origin || userLocation;
      const endLocation = destination || userLocation;

      if (!query && (!startLocation || !endLocation)) return false;

      try {
        setIsLoading(true);
        setComputeRoutes(null);
        setRouteInfoShow(true);
        useStatusStore.getState().startAction("plan_route");

        const response = await getAccessibleRoute({
          origin: startLocation
            ? { latitude: startLocation.lat, longitude: startLocation.lng }
            : undefined,
          destination: endLocation
            ? { latitude: endLocation.lat, longitude: endLocation.lng }
            : undefined,
          query: query || undefined,
          userLocation: userLocation
            ? { latitude: userLocation.lat, longitude: userLocation.lng }
            : undefined,
        });

        if (!response.data?.routes?.length) {
          closeRouteDrawer();
          useStatusStore.getState().failAction("找不到合適的無障礙路線");
          toast.error("找不到合適的無障礙路線");
          return false;
        }

        const routes = response.data.routes;
        setComputeRoutes(routes);
        setRouteSelect({ index: 0, route: routes[0] });

        if (map && response.data.origin && response.data.destination) {
          const bounds = new LngLatBounds(
            [response.data.origin.lng, response.data.origin.lat],
            [response.data.destination.lng, response.data.destination.lat]
          );
          map.fitBounds(bounds, { padding: { top: 50, bottom: 200, left: 50, right: 50 } });
        }
        useStatusStore.getState().succeedAction("plan_route");
        return true;
      } catch (error) {
        closeRouteDrawer();
        console.error("Route planning error:", error);
        useStatusStore.getState().failAction("路線規劃遇到問題，請稍後再試");
        toast.error("路線規劃失敗，請稍後再試");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      map,
      closeRouteDrawer,
      setComputeRoutes,
      setRouteSelect,
      setRouteInfoShow,
      userLocation,
    ]
  );

  const handleComputeRoute = useCallback(
    async (params: {
      origin?: LatLng;
      destination?: LatLng;
      query?: string;
    }): Promise<boolean> => {
      return computeRoute(params);
    },
    [computeRoute]
  );

  return { isLoading, handleComputeRoute };
}
