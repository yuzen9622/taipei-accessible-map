import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Marker, useMap } from "react-map-gl/maplibre";
import { toast } from "sonner";
import useSupercluster from "use-supercluster";
import { useShallow } from "zustand/react/shallow";
import A11yFacilityPin from "@/components/A11yFacilityPin";
import { useAppTranslation } from "@/i18n/client";
import { getAllA11yFacilities } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import { A11yEnum, type Marker as MarkerType } from "@/types";
import type { A11yFacility } from "@/types/route";

// Only elevator/ramp/toilet facilities have a pin category in the current UI
// (see A11yPanel's filter chips); parking/campus-only sources are dropped.
function facilityToMarker(facility: A11yFacility): MarkerType | null {
  let a11yType: A11yEnum;
  switch (facility.category) {
    case "elevator":
      a11yType = A11yEnum.ELEVATOR;
      break;
    case "ramp":
      a11yType = A11yEnum.RAMP;
      break;
    case "toilet":
      a11yType = A11yEnum.RESTROOM;
      break;
    default:
      return null;
  }
  const [lng, lat] = facility.location.coordinates;
  return {
    id: facility._id,
    position: { lat, lng },
    type: "pin",
    content: {
      title: facility.name,
      desc: facility.source === "metro" ? (facility.exitName ?? "") : "",
    },
    zIndex: 1,
    a11yType,
  };
}

export default function A11yFacilitiesWrapper() {
  const { t } = useAppTranslation();
  const { selectedA11yTypes, a11yPlaces, setA11yPlaces, routeA11y } =
    useMapStore(
      useShallow((s) => ({
        selectedA11yTypes: s.selectedA11yTypes,
        a11yPlaces: s.a11yPlaces,
        setA11yPlaces: s.setA11yPlaces,
        routeA11y: s.routeA11y,
      })),
    );
  const { current: map } = useMap();
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );
  const [zoom, setZoom] = useState<number>(15);
  // a11yPlaces lives in the store and survives remounts (route changes, dev
  // HMR); the deployed /all-facilities payload is ~5MB and can take >15s, so
  // fetch it at most once per browser session.
  const [isLoading, setIsLoading] = useState(
    () => (useMapStore.getState().a11yPlaces?.length ?? 0) === 0,
  );

  useEffect(() => {
    if (useMapStore.getState().a11yPlaces?.length) return;
    const controller = new AbortController();
    setIsLoading(true);
    getAllA11yFacilities()
      .then((facilitiesRes) => {
        if (controller.signal.aborted) return;
        const facilities = facilitiesRes.data ?? [];
        setA11yPlaces(
          facilities.flatMap((facility) => {
            const marker = facilityToMarker(facility);
            return marker ? [marker] : [];
          }),
        );
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        toast.error(t("a11yLoadFailed"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [setA11yPlaces, t]);

  const updateBounds = () => {
    if (!map) return;
    const b = map.getBounds();
    if (b) {
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
      setZoom(map.getZoom());
    }
  };

  useEffect(() => {
    if (!map) return;
    updateBounds();
    map.on("move", updateBounds);
    map.on("zoom", updateBounds);
    return () => {
      map.off("move", updateBounds);
      map.off("zoom", updateBounds);
    };
  }, [map]);

  // Pins appear only for explicitly selected facility types — an unfiltered
  // map drowning in clusters was unusable (user feedback).
  const filteredPlaces = useMemo(
    () =>
      selectedA11yTypes.size === 0
        ? []
        : (a11yPlaces?.filter((place) =>
            selectedA11yTypes.has(place.a11yType),
          ) ?? []),
    [selectedA11yTypes, a11yPlaces],
  );

  // Toggling a filter with zero matching results used to render nothing with
  // no explanation ("looked broken"); confirm the empty result explicitly.
  useEffect(() => {
    if (isLoading) return;
    if (selectedA11yTypes.size === 0) return;
    if (filteredPlaces.length === 0) {
      toast(t("noNearbyA11y"));
    }
  }, [selectedA11yTypes, isLoading, filteredPlaces.length, t]);

  const points = useMemo(() => {
    return filteredPlaces.map((place) => ({
      type: "Feature" as const,
      properties: { cluster: false, placeId: place.id, place },
      geometry: {
        type: "Point" as const,
        coordinates: [place.position.lng, place.position.lat],
      },
    }));
  }, [filteredPlaces]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds: bounds || [-180, -85, 180, 85],
    zoom,
    options: { radius: 75, maxZoom: 16 },
  });

  return (
    <>
      {isLoading && selectedA11yTypes.size > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 px-3 py-1.5 text-xs shadow-lg">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("loadingA11yData")}
        </div>
      )}
      {clusters.map((cluster) => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const properties = cluster.properties as any;
        const { cluster: isCluster, point_count: pointCount } = properties;

        if (isCluster) {
          const size = Math.min(30 + (pointCount / points.length) * 40, 60);
          return (
            <Marker
              key={`cluster-${cluster.id}`}
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

        const place = properties.place as MarkerType;
        return <A11yFacilityPin key={`place-${place.id}`} place={place} />;
      })}

      {routeA11y.map((place) => (
        <A11yFacilityPin key={`route-${place.id}`} place={place} />
      ))}
    </>
  );
}
