"use client";
import { ArrowDownUpIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useComputeRoute from "@/hook/useComputeRoute";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import SearchInput from "./shared/PlaceInput";

import { Card } from "./ui/card";

export default function RoutePlanInput() {
  const {
    userLocation,
    setDestination,
    setOrigin,

    origin,
    destination,

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
    <Card
      className={cn(
        "  w-full p-2 flex-row rounded-2xl transition-all items-center pointer-events-auto gap-2"
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
        <button type="button" onClick={handleSwitch} className="p-1">
          <ArrowDownUpIcon size={16} />
        </button>
      </div>
    </Card>
  );
}
