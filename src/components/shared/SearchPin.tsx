import { useCallback } from "react";

import useMapStore from "@/stores/useMapStore";
import { AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

import type { PlaceDetail } from "@/types";
export default function SearchPin({
  destination,
}: {
  destination: PlaceDetail;
}) {
  const { map, setInfoShow } = useMapStore();
  const handleMarker = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!map) return;
      if (!e.latLng) return;
      map.panTo({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      console.log("destination", destination);
      if (destination)
        if (destination.kind === "place") {
          setInfoShow({
            isOpen: true,
            place: destination.place,
            kind: "place",
          });
        } else if (destination.kind === "geocoder") {
          setInfoShow({
            isOpen: true,
            place: destination.place,
            kind: "geocoder",
          });
        }
    },
    [map, setInfoShow, destination]
  );

  if (!destination) return null;

  return (
    <AdvancedMarker
      onClick={(e) => handleMarker(e)}
      position={destination.position}
    >
      <Pin />
    </AdvancedMarker>
  );
}
