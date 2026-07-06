import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Marker, useMap } from "react-map-gl/maplibre";
import { toast } from "sonner";
import useSupercluster from "use-supercluster";
import MetroA11yPin from "@/components/MetroA11yPin";
import { useAppTranslation } from "@/i18n/client";
import { getAllA11yBathrooms, getAllA11yPlaces } from "@/lib/api/a11y";
import { formatBathroom, formatMetroA11y } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { IBathroom, Marker as MarkerType, metroA11yData } from "@/types";

export default function AccessibilityPin() {
  const { t } = useAppTranslation();
  const { selectedA11yTypes, a11yPlaces, setA11yPlaces, routeA11y } =
    useMapStore();
  const { current: map } = useMap();
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );
  const [zoom, setZoom] = useState<number>(15);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    Promise.all([getAllA11yPlaces(), getAllA11yBathrooms()])
      .then(([placesRes, bathroomRes]) => {
        if (controller.signal.aborted) return;
        const places = placesRes.data as metroA11yData[];
        const bathrooms = bathroomRes.data as IBathroom[];
        setA11yPlaces([
          ...formatMetroA11y(places),
          ...formatBathroom(bathrooms),
        ]);
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
        return <MetroA11yPin key={`place-${place.id}`} place={place} />;
      })}

      {routeA11y.map((place) => (
        <MetroA11yPin key={`route-${place.id}`} place={place} />
      ))}
    </>
  );
}
