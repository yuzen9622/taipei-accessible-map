import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import PlaceInput from "./shared/PlaceInput";

export default function SearchInput() {
  const { setSearchPlace, setInfoShow } = useMapStore();
  const [input, setInput] = useState("");
  const handlePlaceChange = useCallback(
    (placeDetail: PlaceDetail) => {
      setSearchPlace(placeDetail);
      if (placeDetail.kind === "place") {
        setInput(placeDetail.place.displayName || "");
        setInfoShow({
          isOpen: true,
          kind: "place",
          place: placeDetail.place,
        });
      }
    },
    [setSearchPlace, setInfoShow]
  );

  return (
    <div
      className={cn(
        "      absolute inset-0 top-5 h-fit w-full  flex justify-center transition-all duration-300"
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
