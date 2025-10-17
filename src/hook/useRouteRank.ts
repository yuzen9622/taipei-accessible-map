import { useCallback, useState } from "react";
import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import { formatRouteForAI } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { Marker } from "@/types";
import type { ApiResponse } from "@/types/response";
import type { AIRankResponse } from "@/types/transit";

export function useRouteRank() {
  const [isLoading, setIsLoading] = useState(false);
  const { setRouteSelect } = useMapStore();

  const getRouteRank = useCallback(
    async (route: google.maps.DirectionsRoute, a11ys: Marker[] = []) => {
      if (!route) return null;
      const request = formatRouteForAI(route, a11ys);
      try {
        setIsLoading(true);
        const data = (await fetchRequest(`${END_POINT}/api/a11y/route-rank`, {
          body: request,
          method: "POST",
        })) as ApiResponse<AIRankResponse>;
        if (data.data) setRouteSelect({ routeRank: data.data });
      } catch (error) {
        console.error("Route ranking error:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [setRouteSelect]
  );

  return { isLoading, getRouteRank };
}
