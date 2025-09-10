import { useCallback } from "react";

import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

import SearchInput from "./shared/PlaceInput";

export default function RoutePlanInput() {
  const { setDestination, setOrigin } = useMapStore();

  const handleOriginPlace = useCallback(
    (place: google.maps.places.Place) => {
      const latLng = getLocation(place);
      if (!latLng) return;
      setOrigin({ kind: "place", place: place, position: latLng });
    },
    [setOrigin]
  );

  const handleDestinationPlace = useCallback(
    (place: google.maps.places.Place) => {
      if (!place.location) return;
      const latLng = getLocation(place);
      if (!latLng) return;
      setDestination({ kind: "place", place: place, position: latLng });
    },
    [setDestination]
  );

  return (
    <div className=" absolute inset-5 h-fit w-full mx-auto max-w-10/12">
      <span className=" relative w-full  flex max-lg:flex-col  rounded-2xl items-center bg-background gap-2">
        <SearchInput
          className="ring-1"
          placeholder="起始點"
          onPlaceSelect={handleOriginPlace}
        />
        <SearchInput
          placeholder="終點"
          onPlaceSelect={handleDestinationPlace}
        />
      </span>
    </div>
  );
}
