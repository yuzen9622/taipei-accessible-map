import { useCallback } from "react";

import useMapStore from "@/stores/useMapStore";
import { AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

export default function SearchPin() {
  const { map, destination, setInfoShow } = useMapStore();
  const handleMarker = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!map) return;
      if (!e.latLng) return;
      map.panTo({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      console.log("destination", destination);
      if (destination) setInfoShow({ isOpen: true, place: destination.place });
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
