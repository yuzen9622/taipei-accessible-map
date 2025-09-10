import { useCallback } from "react";

import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

import PlaceInput from "./shared/PlaceInput";

export default function SearchInput() {
  const { setSearchPlace } = useMapStore();

  const handlePlaceChange = useCallback(
    (place: google.maps.places.Place) => {
      const latLng = getLocation(place);
      if (!latLng) return;
      setSearchPlace({ kind: "place", place, position: latLng });
    },
    [setSearchPlace]
  );

  return (
    <PlaceInput
      placeholder="搜尋想去的地點~"
      onPlaceSelect={handlePlaceChange}
    />
  );
}
