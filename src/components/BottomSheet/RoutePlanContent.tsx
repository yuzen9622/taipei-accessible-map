"use client";

import {
  ArrowLeft,
  ArrowUpDown,
  CircleDot,
  Loader2,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PlaceInput from "@/components/shared/PlaceInput";
import useComputeRoute from "@/hook/useComputeRoute";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import { Button } from "../ui/button";

export default function RoutePlanContent() {
  const { t } = useAppTranslation();
  const {
    origin,
    destination,
    setOrigin,
    setDestination,
    originName,
    destinationName,
    setOriginName,
    setDestinationName,
    userLocation,
    setSheetMode,
    setSearchPlace,
  } = useMapStore();
  const { isLoading, handleComputeRoute } = useComputeRoute();

  const [originInput, setOriginInput] = useState(originName || "");
  const [destInput, setDestInput] = useState(destinationName || "");
  const [useMyLocation, setUseMyLocation] = useState(!origin);

  useEffect(() => {
    setOriginInput(originName || "");
  }, [originName]);

  useEffect(() => {
    setDestInput(destinationName || "");
  }, [destinationName]);

  const handleOriginSelect = useCallback(
    (place: PlaceDetail) => {
      setOrigin(place);
      const name =
        place.kind === "place"
          ? place.place.name || place.place.display_name || ""
          : place.address || "";
      setOriginName(name);
      setOriginInput(name);
      setUseMyLocation(false);
    },
    [setOrigin, setOriginName]
  );

  const handleDestSelect = useCallback(
    (place: PlaceDetail) => {
      setDestination(place);
      const name =
        place.kind === "place"
          ? place.place.name || place.place.display_name || ""
          : place.address || "";
      setDestinationName(name);
      setDestInput(name);
    },
    [setDestination, setDestinationName]
  );

  const handleUseMyLocation = useCallback(() => {
    setOrigin(null);
    setOriginName("");
    setOriginInput("");
    setUseMyLocation(true);
  }, [setOrigin, setOriginName]);

  const handleSwap = useCallback(() => {
    const tmpOrigin = origin;
    const tmpOriginName = originName;
    const tmpUseMyLoc = useMyLocation;

    if (destination) {
      setOrigin(destination);
      setOriginName(destinationName);
      setOriginInput(destinationName);
      setUseMyLocation(false);
    } else {
      setOrigin(null);
      setOriginName("");
      setOriginInput("");
    }

    if (tmpUseMyLoc) {
      setDestination(null);
      setDestinationName("");
      setDestInput("");
    } else if (tmpOrigin) {
      setDestination(tmpOrigin);
      setDestinationName(tmpOriginName);
      setDestInput(tmpOriginName);
    }
  }, [
    origin,
    destination,
    originName,
    destinationName,
    useMyLocation,
    setOrigin,
    setDestination,
    setOriginName,
    setDestinationName,
  ]);

  const handleStartRoute = useCallback(async () => {
    const originPos = useMyLocation
      ? userLocation
      : origin?.position ?? null;
    const destPos = destination?.position ?? null;

    if (!originPos || !destPos) return;

    const success = await handleComputeRoute({
      origin: originPos,
      destination: destPos,
    });
    if (success) {
      setSearchPlace(null);
      setSheetMode("route");
    }
  }, [
    useMyLocation,
    userLocation,
    origin,
    destination,
    handleComputeRoute,
    setSearchPlace,
    setSheetMode,
  ]);

  const handleBack = useCallback(() => {
    setSheetMode("home");
  }, [setSheetMode]);

  const canStart =
    (useMyLocation ? !!userLocation : !!origin?.position) &&
    !!destination?.position;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{t("planRoute")}</h1>
      </div>

      {/* Origin / Destination Inputs */}
      <div className="flex gap-2">
        {/* Route dots */}
        <div className="flex flex-col items-center pt-3 gap-0.5">
          <CircleDot className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 w-0.5 bg-border min-h-[24px]" />
          <MapPin className="h-4 w-4 text-destructive shrink-0" />
        </div>

        {/* Input fields */}
        <div className="flex-1 space-y-2 min-w-0">
          {/* Origin */}
          <div className="relative rounded-xl border border-border overflow-visible">
            {useMyLocation ? (
              <button
                type="button"
                onClick={() => setUseMyLocation(false)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left bg-primary/5"
              >
                <Navigation className="h-4 w-4 text-primary shrink-0" />
                <span className="text-primary font-medium">{t("myLocation")}</span>
              </button>
            ) : (
              <PlaceInput
                hideIcon
                className="border-none text-sm"
                value={originInput}
                onChange={(e) => setOriginInput((e.target as HTMLInputElement).value)}
                placeholder={t("chooseOrigin")}
                onPlaceSelect={handleOriginSelect}
              />
            )}
          </div>

          {/* Destination */}
          <div className="relative rounded-xl border border-border overflow-visible">
            <PlaceInput
              hideIcon
              className="border-none text-sm"
              value={destInput}
              onChange={(e) => setDestInput((e.target as HTMLInputElement).value)}
              placeholder={t("chooseDestination")}
              onPlaceSelect={handleDestSelect}
            />
          </div>
        </div>

        {/* Swap button */}
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleSwap}
            className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* My Location shortcut (when not using it) */}
      {!useMyLocation && (
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-primary hover:bg-primary/5 transition-colors w-full"
        >
          <Navigation className="h-4 w-4" />
          {t("useMyLocationAsOrigin")}
        </button>
      )}

      {/* Start Route */}
      <Button
        onClick={handleStartRoute}
        disabled={isLoading || !canStart}
        className="w-full rounded-xl h-12 text-base gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("loadingRoute")}
          </>
        ) : (
          <>
            <Search className="h-5 w-5" />
            {t("searchRoute")}
          </>
        )}
      </Button>
    </div>
  );
}
