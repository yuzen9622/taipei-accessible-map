import { ArrowDownUpIcon } from "lucide-react";
import { useCallback, useState } from "react";

import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

import SearchInput from "./shared/PlaceInput";
import { Button } from "./ui/button";

export default function RoutePlanInput() {
  const { setDestination, setOrigin, origin, destination } = useMapStore();

  const [OriginSearchInput, setOriginSearchInput] = useState<string>(
    origin?.kind === "place" && origin.place.displayName
      ? origin.place.displayName
      : ""
  );
  const [DestinationSearchInput, setDestinationSearchInput] = useState<string>(
    destination?.kind === "place" && destination.place.displayName
      ? destination.place.displayName
      : ""
  );

  const handleOriginPlace = useCallback(
    (place: google.maps.places.Place) => {
      const latLng = getLocation(place);
      if (!latLng) return;
      setOriginSearchInput(place.displayName || "");
      setOrigin({ kind: "place", place: place, position: latLng });
    },
    [setOrigin]
  );

  const handleDestinationPlace = useCallback(
    (place: google.maps.places.Place) => {
      if (!place.location) return;
      const latLng = getLocation(place);
      if (!latLng) return;
      setDestinationSearchInput(place.displayName || "");
      setDestination({ kind: "place", place: place, position: latLng });
    },
    [setDestination]
  );

  return (
    <span className=" relative w-full  flex flex-col  rounded-2xl items-center bg-background gap-2">
      <SearchInput
        className="  rounded-3xl  "
        placeholder="起始點"
        value={OriginSearchInput}
        onChange={(e) => setOriginSearchInput(e.target.value)}
        onPlaceSelect={handleOriginPlace}
      />
      <Button className="mx-auto" variant={"ghost"}>
        <ArrowDownUpIcon size={16} />
      </Button>
      <SearchInput
        value={DestinationSearchInput}
        placeholder="終點"
        className="  rounded-3xl "
        onChange={(e) => setDestinationSearchInput(e.target.value)}
        onPlaceSelect={handleDestinationPlace}
      />
    </span>
  );
}
