import { LngLatBounds } from "maplibre-gl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getAccessibleRoute } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
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
      waypoints?: LatLng[];
      query?: string;
    }): Promise<boolean> => {
      const { origin, destination, waypoints, query } = params;

      if (!query && !origin && !destination) return false;

      // 自然語言查詢交給後端從文字解析起終點；只有結構化路徑才以使用者位置補缺。
      const startLocation = origin || (query ? undefined : userLocation);
      const endLocation = destination || (query ? undefined : userLocation);

      if (!query && (!startLocation || !endLocation)) return false;

      try {
        setIsLoading(true);
        setComputeRoutes(null);
        setRouteInfoShow(true);

        const response = await getAccessibleRoute({
          origin: startLocation
            ? { latitude: startLocation.lat, longitude: startLocation.lng }
            : undefined,
          destination: endLocation
            ? { latitude: endLocation.lat, longitude: endLocation.lng }
            : undefined,
          waypoints: waypoints?.length
            ? waypoints.map((w) => ({ latitude: w.lat, longitude: w.lng }))
            : undefined,
          query: query || undefined,
          userLocation: userLocation
            ? { latitude: userLocation.lat, longitude: userLocation.lng }
            : undefined,
        });

        if (!response.data?.routes?.length) {
          closeRouteDrawer();
          toast.error("找不到合適的無障礙路線");
          return false;
        }

        const routes = response.data.routes;
        setComputeRoutes(routes);
        setRouteSelect({ index: 0, route: routes[0] });

        if (map && response.data.origin && response.data.destination) {
          const bounds = new LngLatBounds(
            [response.data.origin.lng, response.data.origin.lat],
            [response.data.destination.lng, response.data.destination.lat],
          );
          for (const w of response.data.waypoints ?? []) {
            bounds.extend([w.lng, w.lat]);
          }
          map.fitBounds(bounds, {
            padding: { top: 50, bottom: 200, left: 50, right: 50 },
          });
        }
        return true;
      } catch (error) {
        closeRouteDrawer();
        console.error("Route planning error:", error);
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
    ],
  );

  const handleComputeRoute = useCallback(
    async (params: {
      origin?: LatLng;
      destination?: LatLng;
      waypoints?: LatLng[];
      query?: string;
    }): Promise<boolean> => {
      return computeRoute(params);
    },
    [computeRoute],
  );

  const setComputedRouteData = useCallback(
    (origin: any, destination: any, routes: any[]) => {
      if (!routes?.length) return;
      setComputeRoutes(routes);
      setRouteSelect({ index: 0, route: routes[0] });
      setRouteInfoShow(true);

      if (map && origin && destination) {
        try {
          const bounds = new LngLatBounds(
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          );
          map.fitBounds(bounds, {
            padding: { top: 50, bottom: 200, left: 50, right: 50 },
          });
        } catch (e) {
          console.error("Failed to fit map bounds", e);
        }
      }
    },
    [map, setComputeRoutes, setRouteSelect, setRouteInfoShow]
  );

  return { isLoading, handleComputeRoute, setComputedRouteData };
}
