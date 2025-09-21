import { useCallback, useState } from "react";

import { cn, getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

import PlaceInput from "./shared/PlaceInput";

export default function SearchInput() {
  const { setSearchPlace, setInfoShow } = useMapStore();
  const [input, setInput] = useState("");
  const handlePlaceChange = useCallback(
    (place: google.maps.places.Place) => {
      const latLng = getLocation(place);
      if (!latLng) return;
      setSearchPlace({ kind: "place", place, position: latLng });
      setInfoShow({ isOpen: true, kind: "place", place: place });
    },
    [setSearchPlace, setInfoShow]
  );

  return (
    <div
      className={cn(
        "      absolute inset-0 top-5 h-fit w-full  flex justify-center z-[99] transition-all duration-300"
      )}
    >
      <div className="  w-10/12 mx-auto">
        <PlaceInput
          className="border-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="搜尋想去的地點~"
          onPlaceSelect={handlePlaceChange}
        />
      </div>
    </div>
  );
}
