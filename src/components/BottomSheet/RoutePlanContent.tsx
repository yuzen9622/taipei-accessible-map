"use client";

import {
  ArrowLeft,
  ArrowUpDown,
  Loader2,
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
      if (place.kind === "coordinate" && place.address === "你的位置") {
        setOrigin(null);
        setOriginName("");
        setOriginInput("");
        setUseMyLocation(true);
        return;
      }
      setOrigin(place);
      const name =
        place.kind === "place"
          ? place.place.name || place.place.display_name || ""
          : place.address || "";
      setOriginName(name);
      setOriginInput(name);
      setUseMyLocation(false);
    },
    [setOrigin, setOriginName],
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
    [setDestination, setDestinationName],
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
      if (destination.kind === "coordinate" && destination.address === "你的位置") {
        setOrigin(null);
        setOriginName("");
        setOriginInput("");
        setUseMyLocation(true);
      } else {
        setOrigin(destination);
        setOriginName(destinationName);
        setOriginInput(destinationName);
        setUseMyLocation(false);
      }
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
    const originPos = useMyLocation ? userLocation : (origin?.position ?? null);
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

      {/* Origin / Destination — Gaode-style card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-visible">
        <div className="flex">
          {/* Left: colored dots + line */}
          <div className="flex flex-col items-center py-4 px-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" />
            <div className="flex-1 w-px bg-border my-1 min-h-[20px]" />
            <div className="h-3 w-3 rounded-full bg-red-500 ring-2 ring-red-500/20 shrink-0" />
          </div>

          {/* Right: input fields */}
          <div className="flex-1 min-w-0 py-1">
            {/* Origin input */}
            <div className="relative overflow-visible">
              {useMyLocation ? (
                <button
                  type="button"
                  onClick={() => setUseMyLocation(false)}
                  className="w-full flex items-center gap-2 px-2 py-3 text-sm text-left"
                >
                  <Navigation className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {t("myLocation")}
                  </span>
                </button>
              ) : (
                <PlaceInput
                  hideIcon
                  className="border-none shadow-none text-sm h-11"
                  value={originInput}
                  onChange={(e) =>
                    setOriginInput((e.target as HTMLInputElement).value)
                  }
                  placeholder={t("chooseOrigin")}
                  onPlaceSelect={handleOriginSelect}
                />
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border/60 mx-1" />

            {/* Destination input */}
            <div className="relative overflow-visible">
              <PlaceInput
                hideIcon
                className="border-none shadow-none text-sm h-11"
                value={destInput}
                onChange={(e) =>
                  setDestInput((e.target as HTMLInputElement).value)
                }
                placeholder={t("chooseDestination")}
                onPlaceSelect={handleDestSelect}
              />
            </div>
          </div>

          {/* Swap button */}
          <div className="flex items-center px-2">
            <button
              type="button"
              onClick={handleSwap}
              className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* My Location shortcut */}
      {!useMyLocation && (
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 transition-colors w-full"
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
