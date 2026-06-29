import { useEffect, useMemo, useState } from "react";
import useSupercluster from "use-supercluster";
import { useMap, Marker } from "react-map-gl/maplibre";
import MetroA11yPin from "@/components/MetroA11yPin";
import { getAllA11yBathrooms, getAllA11yPlaces } from "@/lib/api/a11y";
import { formatBathroom, formatMetroA11y } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { IBathroom, Marker as MarkerType, metroA11yData } from "@/types";

export default function AccessibilityPin() {
  const { selectedA11yTypes, a11yPlaces, setA11yPlaces, routeA11y } =
    useMapStore();
  const { current: map } = useMap();
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(
    null,
  );
  const [zoom, setZoom] = useState<number>(15);

  useEffect(() => {
    const controller = new AbortController();
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
      .catch(() => {});
    return () => controller.abort();
  }, [setA11yPlaces]);

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

  const filteredPlaces = useMemo(
    () =>
      selectedA11yTypes.size === 0
        ? (a11yPlaces ?? [])
        : (a11yPlaces?.filter((place) =>
            selectedA11yTypes.has(place.a11yType),
          ) ?? []),
    [selectedA11yTypes, a11yPlaces],
  );

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
