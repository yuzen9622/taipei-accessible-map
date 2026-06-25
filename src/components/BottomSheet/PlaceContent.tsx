"use client";

import {
  Accessibility,
  ArrowLeft,
  ArrowUpDown,
  Bookmark,
  BookmarkCheck,
  Check,
  DoorOpen,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Share2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getNearbyRouteA11yPlaces } from "@/lib/api/a11y";
import { useAppTranslation } from "@/i18n/client";
import { getPlaceTypeLabel } from "@/lib/placeTypes";
import useMapStore from "@/stores/useMapStore";
import type { IBathroom, metroA11yData } from "@/types";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import PlaceReviewSection from "./PlaceReviewSection";

export default function PlaceContent() {
  const { t, i18n } = useAppTranslation();
  const {
    infoShow,
    setInfoShow,
    setSearchPlace,
    setDestination,
    setDestinationName,
    userLocation,
    setSheetMode,
    addSavedPlace,
    removeSavedPlace,
    isSavedPlace,
    map,
  } = useMapStore();

  const [nearbyBathrooms, setNearbyBathrooms] = useState<IBathroom[]>([]);
  const [nearbyMetro, setNearbyMetro] = useState<metroA11yData[]>([]);
  const [a11yLoading, setA11yLoading] = useState(false);

  const placePosition = useMemo(() => {
    if (!infoShow.kind) return null;
    if (infoShow.kind === "place") {
      return { lat: parseFloat(infoShow.place.lat), lng: parseFloat(infoShow.place.lon) };
    }
    if (infoShow.kind === "coordinate" && infoShow.position) {
      return infoShow.position;
    }
    return null;
  }, [infoShow]);

  useEffect(() => {
    if (!placePosition) return;
    setA11yLoading(true);
    getNearbyRouteA11yPlaces(placePosition)
      .then((res) => {
        if (res.ok && res.data) {
          setNearbyBathrooms(res.data.nearbyBathroom || []);
          setNearbyMetro(res.data.nearbyMetroA11y || []);
        }
      })
      .catch(() => {})
      .finally(() => setA11yLoading(false));
  }, [placePosition]);

  const handleBack = useCallback(() => {
    setInfoShow({ isOpen: false, kind: null });
    setSearchPlace(null);
    setSheetMode("home");
  }, [setInfoShow, setSearchPlace, setSheetMode]);

  const handlePlanRoute = useCallback(() => {
    if (!infoShow.kind) return;

    if (infoShow.kind === "place") {
      const place = infoShow.place;
      const latLng = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
      setDestination({ kind: "place", place, position: latLng });
      setDestinationName(place.name || place.display_name || "");
    } else if (infoShow.kind === "coordinate") {
      const latLng = infoShow.position ?? userLocation ?? { lat: 25.0478, lng: 121.5319 };
      setDestination({ kind: "coordinate", address: infoShow.address, position: latLng });
      setDestinationName(infoShow.address || "");
    }

    setSheetMode("plan");
  }, [infoShow, userLocation, setDestination, setDestinationName, setSheetMode]);

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

  const currentPlace: import("@/types").PlaceDetail | null = useMemo(() => {
    if (!infoShow.kind) return null;
    if (infoShow.kind === "place") {
      return { kind: "place", place: infoShow.place, position: { lat: parseFloat(infoShow.place.lat), lng: parseFloat(infoShow.place.lon) } };
    }
    if (infoShow.kind === "coordinate" && infoShow.position) {
      return { kind: "coordinate", address: infoShow.address, position: infoShow.position };
    }
    return null;
  }, [infoShow]);

  const saved = currentPlace ? isSavedPlace(currentPlace) : false;

  const handleToggleSave = useCallback(() => {
    if (!currentPlace) return;
    if (saved) {
      removeSavedPlace(currentPlace);
    } else {
      addSavedPlace(currentPlace);
    }
  }, [currentPlace, saved, addSavedPlace, removeSavedPlace]);

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
  const addressParts = isPlace && place!.address ? place!.address : null;

  const hasA11y = nearbyBathrooms.length > 0 || nearbyMetro.length > 0;

  const a11yChecklist = useMemo(() => {
    const items: { key: string; label: string; available: boolean }[] = [];
    const hasBathroom = nearbyBathrooms.length > 0;
    const hasElevator = nearbyMetro.length > 0;

    if (isPlace && place) {
      const tags = (place as Record<string, unknown>).extratags as Record<string, string> | undefined;
      const wheelchair = tags?.wheelchair || (place as Record<string, unknown>).wheelchair;
      items.push({
        key: "wheelchair",
        label: t("wheelchairAccess"),
        available: wheelchair === "yes" || wheelchair === "limited",
      });
    } else {
      items.push({ key: "wheelchair", label: t("wheelchairAccess"), available: false });
    }

    items.push(
      { key: "elevator", label: t("hasElevator"), available: hasElevator },
      { key: "ramp", label: t("hasRamp"), available: hasElevator },
      { key: "toilet", label: t("hasAccessibleToilet"), available: hasBathroom },
    );
    return items;
  }, [isPlace, place, nearbyBathrooms, nearbyMetro, t]);

  const placeIdForReview = isPlace && place
    ? (place.osm_id ? `${place.osm_type}_${place.osm_id}` : place.place_id?.toString() || "")
    : placePosition ? `${placePosition.lat}_${placePosition.lng}` : "";

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
          className="flex-1 rounded-xl h-11"
        >
          <Navigation className="h-4 w-4 mr-1.5" />
          {t("planRoute")}
        </Button>
        <Button
          onClick={handleToggleSave}
          variant={saved ? "default" : "outline"}
          size="icon"
          className="rounded-xl h-11 w-11 shrink-0"
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
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

      {/* Address Details */}
      {addressParts && (
        <section className="rounded-xl bg-muted/30 p-3 space-y-1.5">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {t("addressInfo")}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {addressParts.road && (
              <div><span className="text-muted-foreground">{t("road")}:</span> {addressParts.road}</div>
            )}
            {(addressParts.suburb || addressParts.neighbourhood) && (
              <div><span className="text-muted-foreground">{t("district")}:</span> {addressParts.suburb || addressParts.neighbourhood}</div>
            )}
            {(addressParts.city || addressParts.town || addressParts.county) && (
              <div><span className="text-muted-foreground">{t("city")}:</span> {addressParts.city || addressParts.town || addressParts.county}</div>
            )}
            {addressParts.postcode && (
              <div><span className="text-muted-foreground">{t("postcode")}:</span> {addressParts.postcode}</div>
            )}
          </div>
        </section>
      )}

      {/* Nearby Accessibility Facilities */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Accessibility className="h-4 w-4" />
          {t("nearbyA11y")}
        </h2>

        {a11yLoading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loadingRoute")}...
          </div>
        ) : hasA11y ? (
          <div className="space-y-2">
            {nearbyBathrooms.slice(0, 4).map((b) => (
              <button
                key={b._id}
                type="button"
                onClick={() => {
                  if (map) map.flyTo({ center: [b.longitude, b.latitude], zoom: 17 });
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <DoorOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.address}</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {t("accessibleToilet")}
                </Badge>
              </button>
            ))}
            {nearbyMetro.slice(0, 4).map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => {
                  if (map) map.flyTo({ center: [parseFloat(m.經度), parseFloat(m.緯度)], zoom: 17 });
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <ArrowUpDown className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m["出入口電梯/無障礙坡道名稱"]}</p>
                  <p className="text-xs text-muted-foreground truncate">{t("elevator")} · {m.出入口編號}</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {t("elevator")}
                </Badge>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">{t("noNearbyA11y")}</p>
        )}
      </section>

      {/* Accessibility Checklist */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Accessibility className="h-4 w-4" />
          {t("a11yChecklist")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {a11yChecklist.map((item) => (
            <div
              key={item.key}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-sm ${
                item.available
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {item.available ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <X className="h-4 w-4 shrink-0 opacity-40" />
              )}
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      {placeIdForReview && (
        <PlaceReviewSection placeId={placeIdForReview} />
      )}
    </div>
  );
}
