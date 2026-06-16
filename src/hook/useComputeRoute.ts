import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getAccessibleRoute } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";

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
      origin?: google.maps.LatLngLiteral;
      destination?: google.maps.LatLngLiteral;
      query?: string;
    }) => {
      const { origin, destination, query } = params;

      if (!query && !origin && !destination) return;

      const startLocation = origin || userLocation;
      const endLocation = destination || userLocation;

      if (!query && (!startLocation || !endLocation)) return;

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
          query: query || undefined,
          userLocation: userLocation
            ? { latitude: userLocation.lat, longitude: userLocation.lng }
            : undefined,
        });

        if (!response.data?.routes?.length) {
          closeRouteDrawer();
          toast.error("找不到合適的無障礙路線");
          return;
        }

        const routes = response.data.routes;
        setComputeRoutes(routes);
        setRouteSelect({ index: 0, route: routes[0] });

        if (map && response.data.origin && response.data.destination) {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend({
            lat: response.data.origin.lat,
            lng: response.data.origin.lng,
          });
          bounds.extend({
            lat: response.data.destination.lat,
            lng: response.data.destination.lng,
          });
          map.fitBounds(bounds, { top: 50, bottom: 200, left: 50, right: 50 });
        }
      } catch (error) {
        closeRouteDrawer();
        console.error("Route planning error:", error);
        toast.error("路線規劃失敗，請稍後再試");
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
      origin?: google.maps.LatLngLiteral;
      destination?: google.maps.LatLngLiteral;
      query?: string;
    }) => {
      await computeRoute(params);
    },
    [computeRoute]
  );

  return { isLoading, handleComputeRoute };
}
