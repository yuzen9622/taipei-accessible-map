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
      originName?: string;
      destinationName?: string;
      query?: string;
    }): Promise<boolean> => {
      const { origin, destination, originName, destinationName, query } = params;

      if (!query && !origin && !destination && !originName && !destinationName) return false;

      const startLocation = origin || userLocation;
      const endLocation = destination || userLocation;

      if (!query && !originName && !startLocation) return false;
      if (!query && !destinationName && !endLocation) return false;

      try {
        setIsLoading(true);
        setComputeRoutes(null);
        setRouteInfoShow(true);
        useStatusStore.getState().startAction("plan_route");

        const resolvedOrigin: string | { latitude: number; longitude: number } | undefined =
          originName || (startLocation ? { latitude: startLocation.lat, longitude: startLocation.lng } : undefined);
        const resolvedDestination: string | { latitude: number; longitude: number } | undefined =
          destinationName || (endLocation ? { latitude: endLocation.lat, longitude: endLocation.lng } : undefined);

        const response = await getAccessibleRoute({
          origin: resolvedOrigin,
          destination: resolvedDestination,
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
        const msg = error instanceof Error ? error.message : "路線規劃遇到問題，請稍後再試";
        useStatusStore.getState().failAction(msg);
        toast.error(msg);
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
      originName?: string;
      destinationName?: string;
      query?: string;
    }): Promise<boolean> => {
      return computeRoute(params);
    },
    [computeRoute]
  );

  return { isLoading, handleComputeRoute };
}
