import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { getAccessibleRoute } from "@/lib/api/a11y";
import {
  extendBounds,
  fitRouteBounds,
  routeBoundsFromLegs,
} from "@/lib/mapCamera";
import useMapStore from "@/stores/useMapStore";
import type { LatLng } from "@/types";

export default function useComputeRoute() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    setComputeRoutes,
    map,
    setRouteSelect,
    setRouteInfoShow,
    setRouteWaypoints,
    userLocation,
    closeRouteDrawer,
  } = useMapStore(
    useShallow((s) => ({
      setComputeRoutes: s.setComputeRoutes,
      map: s.map,
      setRouteSelect: s.setRouteSelect,
      setRouteInfoShow: s.setRouteInfoShow,
      setRouteWaypoints: s.setRouteWaypoints,
      userLocation: s.userLocation,
      closeRouteDrawer: s.closeRouteDrawer,
    })),
  );

  const computeRoute = useCallback(
    async (params: {
      origin?: LatLng;
      destination?: LatLng;
      waypoints?: LatLng[];
      query?: string;
      mode?: "wheelchair" | "elderly" | "visual_impaired" | "normal";
      travelMode?: "transit" | "drive" | "motorcycle" | "walk";
    }): Promise<boolean> => {
      const { origin, destination, waypoints, query, mode, travelMode } =
        params;

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
          mode,
          travelMode,
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

        const apiWaypoints: LatLng[] = (response.data.waypoints ?? [])
          .map((w) => ({
            lat: w.lat ?? (w as any).latitude,
            lng: w.lng ?? (w as any).longitude,
          }))
          .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lng));
        setRouteWaypoints(apiWaypoints);

        if (map) {
          const bounds = routeBoundsFromLegs(routes[0].legs);

          if (
            bounds.isEmpty() &&
            response.data.origin &&
            response.data.destination
          ) {
            const oLat =
              response.data.origin.lat ??
              (response.data.origin as any).latitude;
            const oLng =
              response.data.origin.lng ??
              (response.data.origin as any).longitude;
            const dLat =
              response.data.destination.lat ??
              (response.data.destination as any).latitude;
            const dLng =
              response.data.destination.lng ??
              (response.data.destination as any).longitude;
            extendBounds(bounds, oLng, oLat);
            extendBounds(bounds, dLng, dLat);
          }

          for (const w of response.data.waypoints ?? []) {
            const wLat = w.lat ?? (w as any).latitude;
            const wLng = w.lng ?? (w as any).longitude;
            extendBounds(bounds, wLng, wLat);
          }

          fitRouteBounds(map, bounds);
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
      setRouteWaypoints,
      userLocation,
    ],
  );

  const handleComputeRoute = useCallback(
    async (params: {
      origin?: LatLng;
      destination?: LatLng;
      waypoints?: LatLng[];
      query?: string;
      mode?: "wheelchair" | "elderly" | "visual_impaired" | "normal";
      travelMode?: "transit" | "drive" | "motorcycle" | "walk";
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

      if (map) {
        try {
          const bounds = routeBoundsFromLegs(routes[0].legs);

          if (bounds.isEmpty() && origin && destination) {
            extendBounds(
              bounds,
              origin.lng ?? origin.longitude,
              origin.lat ?? origin.latitude,
            );
            extendBounds(
              bounds,
              destination.lng ?? destination.longitude,
              destination.lat ?? destination.latitude,
            );
          }

          fitRouteBounds(map, bounds);
        } catch (e) {
          console.error("Failed to fit map bounds", e);
        }
      }
    },
    [map, setComputeRoutes, setRouteSelect, setRouteInfoShow],
  );

  return { isLoading, handleComputeRoute, setComputedRouteData };
}
