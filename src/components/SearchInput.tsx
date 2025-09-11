import { useCallback } from "react";

import { cn, getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

import PlaceInput from "./shared/PlaceInput";

export default function SearchInput() {
  const { setSearchPlace, infoShow } = useMapStore();

  const handlePlaceChange = useCallback(
    (place: google.maps.places.Place) => {
      const latLng = getLocation(place);
      if (!latLng) return;
      setSearchPlace({ kind: "place", place, position: latLng });
    },
    [setSearchPlace]
  );

  return (
    <div
      className={cn(
        " fixed  box-border  inset-0 top-5 h-fit w-full  flex justify-center z-10 transition-all duration-300",
        infoShow.isOpen && "lg:ml-[360px] lg:max-w-8/12"
      )}
    >
      <div className=" relative w-10/12 mx-auto">
        <PlaceInput
          placeholder="搜尋想去的地點~"
          onPlaceSelect={handlePlaceChange}
        />
      </div>
    </div>
  );
}
