"use client";
import { ArrowDownUpIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useComputeRoute from "@/hook/useComputeRoute";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import SearchInput from "./shared/PlaceInput";
import { Button } from "./ui/button";

export default function RoutePlanInput() {
  const {
    userLocation,
    setDestination,
    setOrigin,
    a11yDrawerOpen,
    origin,
    destination,
    searchPlace,
    setSearchPlace,
    setInfoShow,
  } = useMapStore();

  const { computeRouteService } = useComputeRoute();

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
    (placeDetail: PlaceDetail) => {
      if (placeDetail.kind === "place") {
        setOriginSearchInput(placeDetail.place.displayName || "");
      }

      setOrigin(placeDetail);

      if (destination?.position) {
        computeRouteService(placeDetail.position, destination.position);
      }
    },
    [setOrigin, destination, computeRouteService]
  );

  const handleDestinationPlace = useCallback(
    (placeDetail: PlaceDetail) => {
      setDestination(placeDetail);
      if (placeDetail.kind === "place") {
        setDestinationSearchInput(placeDetail.place.displayName || "");
        setInfoShow({
          isOpen: true,
          kind: "place",
          place: placeDetail.place,
        });
      }
      setSearchPlace(null);

      if (origin?.position) {
        computeRouteService(
          userLocation || origin.position,
          placeDetail.position
        );
      }
    },
    [
      setDestination,
      setInfoShow,
      setSearchPlace,
      computeRouteService,
      origin,
      userLocation,
    ]
  );

  const handleSwitch = () => {
    setOrigin(destination);
    setDestination(origin);
    if (destination?.position && origin?.position) {
      computeRouteService(destination?.position, origin?.position);
    }
  };

  useEffect(() => {
    setOriginSearchInput("");
    if (origin?.kind === "place")
      setOriginSearchInput(origin.place.displayName || "");
  }, [origin]);

  useEffect(() => {
    setDestinationSearchInput("");
    if (destination?.kind === "place")
      setDestinationSearchInput(destination.place.displayName || "");
  }, [destination]);

  return (
    <div
      className={cn(
        "  w-full p-2 flex rounded-2xl transition-all items-center bg-transparent gap-2",
        (a11yDrawerOpen || !searchPlace) && "  hidden"
      )}
    >
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
    </div>
  );
}
