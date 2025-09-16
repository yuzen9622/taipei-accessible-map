import { useCommandState } from "cmdk";
import { set } from "lodash";
import { ArrowDownUpIcon } from "lucide-react";
import { useCallback, useState } from "react";

import useComputeRoute from "@/hook/useComputeRoute";
import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

import SearchInput from "./shared/PlaceInput";
import { Button } from "./ui/button";

export default function RoutePlanInput() {
  const {
    setDestination,
    setOrigin,
    origin,
    destination,
    setSearchPlace,
    setInfoShow,
  } = useMapStore();

  const { computeRoute } = useComputeRoute();

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
      setInfoShow({ isOpen: false, kind: "place", place: place });
      setSearchPlace(null);
      computeRoute({ lat: 25.0475613, lng: 121.5173399 }, latLng);
    },
    [setDestination, setInfoShow, setSearchPlace, computeRoute]
  );

  const handleSwitch = () => {
    if (origin?.kind === "place" && destination?.kind === "place") {
      setOriginSearchInput(destination.place.displayName || "");
      setDestinationSearchInput(origin.place.displayName || "");
      setInfoShow({ isOpen: false, kind: "place", place: origin.place });
    }
    setOrigin(destination);
    setDestination(origin);
  };

  return (
    <span className=" relative w-full  flex   rounded-2xl items-center bg-background gap-2">
      <div className="w-full space-y-2">
        <div className="border rounded-3xl ">
          <SearchInput
            className=" border-none rounded-3xl  "
            placeholder="起始點"
            value={OriginSearchInput}
            onChange={(e) => setOriginSearchInput(e.target.value)}
            onPlaceSelect={handleOriginPlace}
          />
        </div>{" "}
        <div className="border rounded-3xl">
          <SearchInput
            value={DestinationSearchInput}
            placeholder="終點"
            className=" border-none  rounded-3xl "
            onChange={(e) => setDestinationSearchInput(e.target.value)}
            onPlaceSelect={handleDestinationPlace}
          />
        </div>
      </div>

      <div>
        <Button onClick={handleSwitch} className="mx-auto" variant={"ghost"}>
          <ArrowDownUpIcon size={16} />
        </Button>
      </div>
    </span>
  );
}
