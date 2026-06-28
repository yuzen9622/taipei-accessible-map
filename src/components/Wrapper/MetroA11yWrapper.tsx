import { useEffect, useMemo } from "react";
import MetroA11yPin from "@/components/MetroA11yPin";
import { getAllA11yBathrooms, getAllA11yPlaces } from "@/lib/api/a11y";
import { formatBathroom, formatMetroA11y } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { IBathroom, Marker, metroA11yData } from "@/types";

export default function AccessibilityPin() {
  const { selectedA11yTypes, a11yPlaces, setA11yPlaces, routeA11y } =
    useMapStore();

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getAllA11yPlaces(), getAllA11yBathrooms()])
      .then(([placesRes, bathroomRes]) => {
        if (controller.signal.aborted) return;
        const places = placesRes.data as metroA11yData[];
        const bathrooms = bathroomRes.data as IBathroom[];
        setA11yPlaces([...formatMetroA11y(places), ...formatBathroom(bathrooms)]);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [setA11yPlaces]);

  const filteredPlaces = useMemo(() =>
    selectedA11yTypes.size === 0
      ? a11yPlaces ?? []
      : a11yPlaces?.filter((place) => selectedA11yTypes.has(place.a11yType)) ?? [],
    [selectedA11yTypes, a11yPlaces],
  );

  return (
    <>
      {filteredPlaces.map((place) => (
        <MetroA11yPin key={place.id} place={place} />
      ))}
      {routeA11y.map((place) => (
        <MetroA11yPin key={place.id} place={place} />
      ))}
    </>
  );
}
