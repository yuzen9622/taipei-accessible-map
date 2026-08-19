"use client";

import { useEffect, useMemo } from "react";
import { Marker, useMap } from "react-map-gl/maplibre";
import useSupercluster from "use-supercluster";
import { useShallow } from "zustand/react/shallow";
import { parkingItemLngLat } from "@/components/BottomSheet/ParkingPanel";
import ParkingPin from "@/components/ParkingPin";
import { useMapBoundsAndZoom } from "@/hook/useMapBoundsAndZoom";
import { getNearbyParking } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import type { ParkingNearbyItem } from "@/types/route";

export default function ParkingWrapper() {
  const { current: map } = useMap();
  const { activeRailPanel, userLocation, nearbyParking, setNearbyParking } =
    useMapStore(
      useShallow((s) => ({
        activeRailPanel: s.activeRailPanel,
        userLocation: s.userLocation,
        nearbyParking: s.nearbyParking,
        setNearbyParking: s.setNearbyParking,
      })),
    );

  const { bounds, zoom } = useMapBoundsAndZoom(map);

  // Auto-fetch if user opened the parking panel and store has no data yet
  useEffect(() => {
    if (activeRailPanel !== "parking") return;
    if (nearbyParking.length > 0) return;
    if (!userLocation) return;

    let active = true;
    getNearbyParking(userLocation.lat, userLocation.lng)
      .then((res) => {
        if (active && res.ok && res.data) {
          setNearbyParking(res.data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [activeRailPanel, nearbyParking.length, userLocation, setNearbyParking]);

  const shouldShow = activeRailPanel === "parking";

  const points = useMemo(() => {
    if (!shouldShow) return [];
    return nearbyParking.flatMap((item) => {
      const pos = parkingItemLngLat(item);
      if (!pos) return [];
      return [
        {
          type: "Feature" as const,
          properties: { cluster: false, parkingId: item._id, item },
          geometry: {
            type: "Point" as const,
            coordinates: [pos.lng, pos.lat],
          },
        },
      ];
    });
  }, [shouldShow, nearbyParking]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds: bounds || [-180, -85, 180, 85],
    zoom,
    options: { radius: 60, maxZoom: 16 },
  });

  if (!shouldShow || points.length === 0) return null;

  return (
    <>
      {clusters.map((cluster) => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const properties = cluster.properties as {
          cluster?: boolean;
          point_count?: number;
          parkingId?: string;
          item?: ParkingNearbyItem;
        };
        const { cluster: isCluster, point_count: pointCount = 0 } = properties;

        if (isCluster) {
          const size = Math.min(32 + (pointCount / points.length) * 32, 56);
          return (
            <Marker
              key={`parking-cluster-${cluster.id}`}
              latitude={latitude}
              longitude={longitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                if (!supercluster || !map) return;
                const expansionZoom = Math.min(
                  supercluster.getClusterExpansionZoom(cluster.id as number),
                  20,
                );
                map.flyTo({
                  center: [longitude, latitude],
                  zoom: expansionZoom,
                  duration: 500,
                });
              }}
            >
              <div
                className="flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shadow-md cursor-pointer border-2 border-background transition-transform hover:scale-110"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  fontSize: `${Math.max(12, size / 3)}px`,
                }}
              >
                {pointCount}
              </div>
            </Marker>
          );
        }

        const item = properties.item;
        if (!item) return null;
        return <ParkingPin key={`parking-${item._id}`} item={item} />;
      })}
    </>
  );
}
