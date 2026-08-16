import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { useAppTranslation } from "@/i18n/client";
import { getAccessibleRoute } from "@/lib/api/a11y";
import { haversineMeters } from "@/lib/geo";
import {
  extendBounds,
  fitRouteBounds,
  routeBoundsFromLegs,
} from "@/lib/mapCamera";
import useMapStore from "@/stores/useMapStore";
import type { LatLng } from "@/types";

// Past this, a straight-line distance is well beyond any plausible
// domestic trip (Taipei–Kaohsiung is ~300km) and almost certainly means
// the origin/destination pair is outside this app's coverage entirely —
// catching it here gives an accurate "too far apart" message instead of
// a generic "failed, try again" that implies retrying would help.
const MAX_ROUTE_METERS = 500_000;

export default function useComputeRoute() {
  const { t } = useAppTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const {
    setComputeRoutes,
    setMetroAlerts,
    setTransitAlerts,
    map,
    setRouteSelect,
    setRouteInfoShow,
    setRouteWaypoints,
    setLiveBusPositions,
    userLocation,
  } = useMapStore(
    useShallow((s) => ({
      setComputeRoutes: s.setComputeRoutes,
      setMetroAlerts: s.setMetroAlerts,
      setTransitAlerts: s.setTransitAlerts,
      map: s.map,
      setRouteSelect: s.setRouteSelect,
      setRouteInfoShow: s.setRouteInfoShow,
      setRouteWaypoints: s.setRouteWaypoints,
      setLiveBusPositions: s.setLiveBusPositions,
      userLocation: s.userLocation,
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

      if (
        startLocation &&
        endLocation &&
        haversineMeters(startLocation, endLocation) > MAX_ROUTE_METERS
      ) {
        toast.error(t("routeTooFar", "起點與終點距離過遠，本服務目前涵蓋台灣"));
        return false;
      }

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
          // Was `closeRouteDrawer()` — that clears origin/destination/mode
          // and switches away from the planning form entirely, so a failed
          // attempt silently discarded everything the user had just typed
          // in, with no way to tweak one setting and retry. Falling back to
          // the form (routeInfoShow: false) instead keeps all of it intact.
          // Still clear the previous *result* (route line, waypoints, live
          // bus positions) though — `RouteWrapper`/`LiveBusWrapper` draw
          // those unconditionally off `selectRoute`/`routeWaypoints`/
          // `liveBusPositions`, not off `routeInfoShow`, so without this a
          // stale route from an earlier successful search would keep
          // showing on the map as if it were still valid.
          setRouteInfoShow(false);
          setRouteSelect(null);
          setRouteWaypoints([]);
          setLiveBusPositions([]);
          toast.error("找不到合適的無障礙路線");
          return false;
        }

        const routes = response.data.routes;
        setComputeRoutes(routes);
        setMetroAlerts(response.data.metroAlerts ?? null);
        setTransitAlerts(response.data.transitAlerts ?? null);
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
        // Same reasoning as the no-routes branch above — keep the form
        // filled in so a network hiccup doesn't cost the user their inputs,
        // but still drop the stale result so it doesn't keep drawing on
        // the map as if it were current.
        setRouteInfoShow(false);
        setRouteSelect(null);
        setRouteWaypoints([]);
        setLiveBusPositions([]);
        console.error("Route planning error:", error);
        toast.error("路線規劃失敗，請稍後再試");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      map,
      setComputeRoutes,
      setMetroAlerts,
      setTransitAlerts,
      setRouteSelect,
      setRouteInfoShow,
      setRouteWaypoints,
      setLiveBusPositions,
      userLocation,
      t,
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
