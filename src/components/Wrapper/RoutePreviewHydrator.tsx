"use client";

import { LngLatBounds } from "maplibre-gl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { getLineRoutePreview } from "@/lib/api/line";
import { ApiError } from "@/lib/fetch";
import { adaptRoutePreviewRoutes } from "@/lib/routePreviewAdapter";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";

function coordinatePlace(label: string, lat?: number, lng?: number) {
  if (lat == null || lng == null) return null;
  return {
    kind: "coordinate",
    address: label,
    position: { lat, lng },
  } satisfies PlaceDetail;
}

function getSessionId(searchParams: ReturnType<typeof useSearchParams>): string | null {
  const direct = searchParams.get("sessionId");
  if (direct) return direct;

  const liffState = searchParams.get("liff.state");
  if (liffState) {
    try {
      const queryStart = liffState.indexOf("?");
      const queryString =
        queryStart !== -1
          ? liffState.substring(queryStart)
          : liffState.includes("=")
            ? `?${liffState}`
            : "";
      if (queryString) {
        const parsed = new URLSearchParams(queryString);
        return parsed.get("sessionId");
      }
    } catch (e) {
      console.error("Failed to parse liff.state:", e);
    }
  }

  return null;
}

export default function RoutePreviewHydrator() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hydratedSessionRef = useRef<string | null>(null);
  const {
    map,
    setComputeRoutes,
    setRouteSelect,
    setRouteInfoShow,
    setSheetMode,
    setActiveRailPanel,
    setOrigin,
    setDestination,
    setOriginName,
    setDestinationName,
  } = useMapStore();

  useEffect(() => {
    const sessionId = getSessionId(searchParams);
    if (!sessionId || hydratedSessionRef.current === sessionId) return;

    let cancelled = false;
    hydratedSessionRef.current = sessionId;

    const clearQuery = () => {
      router.replace(pathname, { scroll: false });
    };

    const hydrate = async () => {
      try {
        const response = await getLineRoutePreview(sessionId);
        if (cancelled || !response.data?.routes?.length) {
          if (!cancelled) clearQuery();
          return;
        }

        const preview = response.data;
        const routes = adaptRoutePreviewRoutes(preview.routes);
        const selectedRoute = routes[0];
        if (!selectedRoute) {
          clearQuery();
          return;
        }

        setComputeRoutes(routes);
        setRouteSelect({ index: 0, route: selectedRoute });
        setRouteInfoShow(true);
        setSheetMode("route");
        setActiveRailPanel("route");
        setOriginName(preview.origin.label);
        setDestinationName(preview.destination.label);
        setOrigin(
          coordinatePlace(
            preview.origin.label,
            preview.origin.lat,
            preview.origin.lng,
          ),
        );
        setDestination(
          coordinatePlace(
            preview.destination.label,
            preview.destination.lat,
            preview.destination.lng,
          ),
        );

        if (map) {
          const bounds = new LngLatBounds();
          if (preview.origin.lat != null && preview.origin.lng != null) {
            bounds.extend([preview.origin.lng, preview.origin.lat]);
          }
          bounds.extend([preview.destination.lng, preview.destination.lat]);
          for (const leg of selectedRoute.legs) {
            for (const [lng, lat] of leg.polyline ?? []) {
              bounds.extend([lng, lat]);
            }
          }
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, {
              padding: { top: 80, bottom: 220, left: 60, right: 60 },
              maxZoom: 17,
            });
          }
        }
      } catch (err) {
        if (err instanceof ApiError && (err.code === 404 || err.code === 410)) {
          clearQuery();
          return;
        }
        clearQuery();
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [
    map,
    pathname,
    router,
    searchParams,
    setActiveRailPanel,
    setComputeRoutes,
    setDestination,
    setDestinationName,
    setOrigin,
    setOriginName,
    setRouteInfoShow,
    setRouteSelect,
    setSheetMode,
  ]);

  return null;
}
