"use client";
import { ArrowDownUpIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useComputeRoute from "@/hook/useComputeRoute";
import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import SearchInput from "./shared/PlaceInput";
import { Button } from "./ui/button";

export default function RoutePlanInput() {
  const {
    userLocation,
    setDestination,
    setOrigin,
    origin,
    destination,
    setSearchPlace,
    setInfoShow,
    addSearchHistory, // 取得 function
  } = useMapStore();

  const { computeRoute } = useComputeRoute();

  const [originSearchInput, setOriginSearchInput] = useState<string>(
    origin?.kind === "place" && origin.place.displayName
      ? origin.place.displayName
      : ""
  );
  const [destinationSearchInput, setDestinationSearchInput] = useState<string>(
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
      addSearchHistory(place.displayName || ""); // 新增到搜尋歷史
      if (destination?.position) {
        computeRoute(latLng, destination.position);
      }
    },
    [setOrigin, destination, computeRoute, addSearchHistory]
  );

  const handleDestinationPlace = useCallback(
    (place: google.maps.places.Place) => {
      if (!place.location) return;
      const latLng = getLocation(place);
      if (!latLng) return;
      setDestination({ kind: "place", place: place, position: latLng });
      setInfoShow({ isOpen: false, kind: "place", place: place });
      setSearchPlace(null);
      addSearchHistory(place.displayName || ""); // 新增到搜尋歷史
      if (origin?.position) {
        computeRoute(userLocation || origin.position, latLng);
      }
    },
    [setDestination, setInfoShow, setSearchPlace, computeRoute, origin, userLocation, addSearchHistory]
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

  useEffect(() => {
    if (origin?.kind === "place") setOriginSearchInput(origin.place.displayName || "");
  }, [origin]);

  useEffect(() => {
    if (destination?.kind === "place") setDestinationSearchInput(destination.place.displayName || "");
  }, [destination]);

  return (
    <span className="relative w-full flex rounded-2xl items-center bg-background gap-2">
      <div className="w-full space-y-2">
        <div className="border rounded-3xl">
          <SearchInput
            className="border-none rounded-3xl"
            placeholder="起始點"
            value={originSearchInput}
            onChange={(e) => setOriginSearchInput(e.target.value)}
            onPlaceSelect={handleOriginPlace}
          />
        </div>
        <div className="border rounded-3xl">
          <SearchInput
            value={destinationSearchInput}
            placeholder="終點"
            className="border-none rounded-3xl"
            onChange={(e) => setDestinationSearchInput(e.target.value)}
            onPlaceSelect={handleDestinationPlace}
          />
        </div>
      </div>
      <div>
        <Button onClick={handleSwitch} className="mx-auto" variant="ghost">
          <ArrowDownUpIcon size={16} />
        </Button>
      </div>
    </span>
  );
}
