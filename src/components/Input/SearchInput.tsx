import { useCallback, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import PlaceInput from "../shared/PlaceInput";

export default function SearchInput() {
  const { setSearchPlace, setInfoShow, routeInfoShow, map } = useMapStore();
  const [input, setInput] = useState("");
  const { t } = useAppTranslation("translation");

  const handlePlaceChange = useCallback(
    (placeDetail: PlaceDetail) => {
      setSearchPlace(placeDetail);
      if (placeDetail.kind === "place") {
        setInput(placeDetail.place.name || placeDetail.place.display_name || "");
        setInfoShow({
          isOpen: true,
          kind: "place",
          place: placeDetail.place,
        });
        if (map) map.flyTo({ center: [placeDetail.position.lng, placeDetail.position.lat] });
      } else if (placeDetail.kind === "coordinate") {
        setInput(placeDetail.address || "");
        setInfoShow({
          isOpen: true,
          kind: "coordinate",
          address: placeDetail.address,
        });
        if (map) map.flyTo({ center: [placeDetail.position.lng, placeDetail.position.lat] });
      }
    },
    [setSearchPlace, setInfoShow, map]
  );

  return (
    <div
      className={cn(
        "    relative pointer-events-auto h-fit w-full flex justify-center transition-all duration-300",
        routeInfoShow && "hidden"
      )}
    >
      <div className="  w-full mx-auto rounded-3xl shadow-md  ">
        <PlaceInput
          className="border-none "
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("searchPlaceHolder")}
          onPlaceSelect={handlePlaceChange}
        />
      </div>
    </div>
  );
}
