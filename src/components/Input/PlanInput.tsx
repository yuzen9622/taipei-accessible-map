"use client";
import { ArrowDownUpIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useComputeRoute from "@/hook/useComputeRoute";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import SearchInput from "../shared/PlaceInput";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

export default function RoutePlanInput() {
  const {
    setDestination,
    setOrigin,
    origin,
    destination,
    setSearchPlace,
    setInfoShow,
    travelMode,
    setTravelMode,
  } = useMapStore();

  const { handleComputeRoute } = useComputeRoute();

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
  // const handleComputeRoute = useCallback(
  //   async (mode?: google.maps.TravelMode) => {
  //     if (!origin?.position && !destination?.position) return;
  //     const startLocation = origin?.position || userLocation;
  //     const endLocation = destination?.position || userLocation;
  //     if (startLocation && endLocation) {
  //       computeRouteService(startLocation, endLocation, mode || travelMode);
  //     }
  //   },
  //   [userLocation, origin, destination, computeRouteService, travelMode]
  // );

  const handleTravelModeChange = (mode: google.maps.TravelMode) => {
    setTravelMode(mode);
    handleComputeRoute({
      origin: origin?.position,
      destination: destination?.position,
      mode,
    });
  };

  const handleOriginPlace = useCallback(
    (placeDetail: PlaceDetail) => {
      if (placeDetail.kind === "place") {
        setOriginSearchInput(placeDetail.place.displayName || "");
      }

      setOrigin(placeDetail);

      handleComputeRoute({
        origin: placeDetail.position,
        destination: destination?.position,
      });
    },
    [setOrigin, handleComputeRoute, destination]
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

      handleComputeRoute({
        origin: origin?.position,
        destination: placeDetail.position,
      });
    },
    [setDestination, setInfoShow, setSearchPlace, handleComputeRoute, origin]
  );

  const handleSwitch = () => {
    setOrigin(destination);
    setDestination(origin);
    if (destination?.position && origin?.position) {
      handleComputeRoute({
        origin: destination?.position,
        destination: origin?.position,
      });
    }
  };

  useEffect(() => {
    setOriginSearchInput("");
    if (origin?.kind === "place") {
      setOriginSearchInput(origin.place.displayName || "");
    } else if (origin?.kind === "geocoder") {
      setOriginSearchInput(origin.place.formatted_address || "");
    }
  }, [origin]);

  useEffect(() => {
    setDestinationSearchInput("");
    if (destination?.kind === "place") {
      setDestinationSearchInput(destination.place.displayName || "");
    } else if (destination?.kind === "geocoder") {
      setDestinationSearchInput(destination.place.formatted_address || "");
    }
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
        <div className="flex gap-4 ">
          <Badge
            variant={
              travelMode === google.maps.TravelMode.TRANSIT
                ? "default"
                : "outline"
            }
            onClick={() =>
              handleTravelModeChange(google.maps.TravelMode.TRANSIT)
            }
            className="rounded-3xl px-3 py-1"
            asChild
          >
            <button aria-label="Public transport" type="button">
              大眾運輸
            </button>
          </Badge>
          <Badge
            variant={
              travelMode === google.maps.TravelMode.WALKING
                ? "default"
                : "outline"
            }
            onClick={() =>
              handleTravelModeChange(google.maps.TravelMode.WALKING)
            }
            asChild
            className="rounded-3xl px-3 py-1"
          >
            <button aria-label="Walking" type="button">
              走路
            </button>
          </Badge>
        </div>
      </div>
      <div>
        <button
          aria-label="Switch origin and destination"
          type="button"
          onClick={handleSwitch}
          className="p-1"
        >
          <ArrowDownUpIcon size={16} />
        </button>
      </div>
    </Card>
  );
}
