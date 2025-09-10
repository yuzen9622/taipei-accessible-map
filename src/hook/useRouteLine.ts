import { useEffect } from "react";

import useMapStore from "@/stores/useMapStore";

import type { PlaceDetail } from "@/types";

export default function useRouteLine() {
  const { setOrigin, setDestination, map, origin, destination } = useMapStore();

  const handleOriginChange = (newOrigin: google.maps.places.Place) => {
    if (!newOrigin.location) return;
    const pos = {
      lat: newOrigin.location.lat(),
      lng: newOrigin.location.lng(),
    };
    const origin = setOrigin({
      place: newOrigin,
      position: pos,
    } as PlaceDetail);
  };

  const handleDestinationChange = (
    newDestination: google.maps.places.Place | null
  ) => {
    if (!newDestination?.location) return;
    const pos = {
      lat: newDestination?.location.lat(),
      lng: newDestination?.location.lng(),
    };
    setDestination({ place: newDestination, position: pos } as PlaceDetail);
  };

  useEffect(() => {
    if (!origin || !destination || !map) return;
  }, [origin, destination, map]);
  return { handleOriginChange, handleDestinationChange, origin, destination };
}
