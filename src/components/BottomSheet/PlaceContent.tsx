"use client";

import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Share2,
} from "lucide-react";
import { useCallback } from "react";
import useComputeRoute from "@/hook/useComputeRoute";
import { useAppTranslation } from "@/i18n/client";
import { getPlaceTypeLabel } from "@/lib/placeTypes";
import useMapStore from "@/stores/useMapStore";
import type { LatLng } from "@/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export default function PlaceContent() {
  const { t, i18n } = useAppTranslation();
  const {
    infoShow,
    setInfoShow,
    setSearchPlace,
    setDestination,
    userLocation,
    setSheetMode,
  } = useMapStore();
  const { isLoading, handleComputeRoute } = useComputeRoute();

  const handleBack = useCallback(() => {
    setInfoShow({ isOpen: false, kind: null });
    setSearchPlace(null);
    setSheetMode("home");
  }, [setInfoShow, setSearchPlace, setSheetMode]);

  const handlePlanRoute = useCallback(async () => {
    if (!infoShow.kind) return;
    let latLng: LatLng | null = null;

    if (infoShow.kind === "place") {
      const place = infoShow.place;
      latLng = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
      setDestination({ kind: "place", place, position: latLng });
    } else if (infoShow.kind === "coordinate") {
      latLng = infoShow.position ?? userLocation ?? { lat: 25.0478, lng: 121.5319 };
      setDestination({ kind: "coordinate", address: infoShow.address, position: latLng });
    }

    const success = await handleComputeRoute({
      origin: userLocation ?? { lat: 25.0478, lng: 121.5319 },
      destination: latLng ?? undefined,
    });
    if (success) {
      setSearchPlace(null);
      setSheetMode("route");
    }
  }, [infoShow, userLocation, setDestination, handleComputeRoute, setSearchPlace, setSheetMode]);

  const handleShare = useCallback(async () => {
    if (!infoShow.kind) return;
    let url = "https://www.openstreetmap.org";
    if (infoShow.kind === "place") {
      const place = infoShow.place;
      if (place.osm_id && place.osm_type) {
        url = `https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`;
      }
    }
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* user cancelled */ }
  }, [infoShow]);

  if (!infoShow.kind) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPlace = infoShow.kind === "place";
  const place = isPlace ? infoShow.place : null;
  const name = isPlace
    ? place!.name || place!.display_name
    : infoShow.address;
  const address = isPlace ? place!.display_name : infoShow.address;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="mt-1 h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight line-clamp-2">{name}</h1>
          {isPlace && place!.name && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {address}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {isPlace && place!.type && (
          <Badge variant="secondary" className="rounded-full">
            {getPlaceTypeLabel(place!.type, i18n.language)}
          </Badge>
        )}
        {isPlace && place!.osm_id && (
          <a
            href={`https://www.openstreetmap.org/${place!.osm_type}/${place!.osm_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Badge variant="outline" className="rounded-full gap-1 cursor-pointer hover:bg-muted">
              <ExternalLink className="h-3 w-3" />
              {t("viewOnOSM")}
            </Badge>
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handlePlanRoute}
          disabled={isLoading}
          className="flex-1 rounded-xl h-11"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              {t("loadingRoute")}
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4 mr-1.5" />
              {t("planRoute")}
            </>
          )}
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          size="icon"
          className="rounded-xl h-11 w-11 shrink-0"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
