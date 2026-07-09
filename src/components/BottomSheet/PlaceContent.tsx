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
import { useAppTranslation } from "@/i18n/client";
import { getNearbyRouteA11yPlaces, getOsmPlaceDetail } from "@/lib/api/a11y";
import { getPlaceTypeLabel } from "@/lib/placeTypes";
import useMapStore from "@/stores/useMapStore";
import type { IBathroom, metroA11yData } from "@/types";
import type { OsmPlaceDetail } from "@/types/route";
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
  const [osmDetail, setOsmDetail] = useState<OsmPlaceDetail | null>(null);

  const placePosition = useMemo(() => {
    if (!infoShow.kind) return null;
    if (infoShow.kind === "place") {
      return {
        lat: parseFloat(infoShow.place.lat),
        lng: parseFloat(infoShow.place.lon),
      };
    }
    if (infoShow.kind === "coordinate" && infoShow.position) {
      return infoShow.position;
    }
    return null;
  }, [infoShow]);

  useEffect(() => {
    if (!placePosition) return;
    const controller = new AbortController();
    setA11yLoading(true);
    getNearbyRouteA11yPlaces(placePosition, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted && res.ok && res.data) {
          setNearbyBathrooms(res.data.nearbyBathroom || []);
          setNearbyMetro(res.data.nearbyMetroA11y || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setA11yLoading(false);
      });
    return () => controller.abort();
  }, [placePosition]);

  useEffect(() => {
    if (!infoShow.kind || infoShow.kind !== "place") {
      setOsmDetail(null);
      return;
    }
    const osmId = infoShow.place.osm_id;
    if (!osmId) {
      setOsmDetail(null);
      return;
    }
    const controller = new AbortController();
    getOsmPlaceDetail(String(osmId), controller.signal)
      .then((res) => {
        if (!controller.signal.aborted && res.ok && res.data) {
          const detail = Array.isArray(res.data) ? res.data[0] : res.data;
          setOsmDetail(detail ?? null);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [infoShow]);

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
      const latLng = infoShow.position ??
        userLocation ?? { lat: 25.0478, lng: 121.5319 };
      setDestination({
        kind: "coordinate",
        address: infoShow.address,
        position: latLng,
      });
      setDestinationName(infoShow.address || "");
    }

    setSheetMode("plan");
  }, [
    infoShow,
    userLocation,
    setDestination,
    setDestinationName,
    setSheetMode,
  ]);

  const handleShare = useCallback(async () => {
    if (!infoShow.kind) return;
    let url = process.env.NEXT_PUBLIC_URL ?? window.location.origin;
    if (infoShow.kind === "place") {
      const place = infoShow.place;
      if (place.osm_id && place.osm_type) {
        url += `?place=${place.osm_type}_${place.osm_id}`;
      }
    }
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled */
    }
  }, [infoShow]);

  const currentPlace: import("@/types").PlaceDetail | null = useMemo(() => {
    if (!infoShow.kind) return null;
    if (infoShow.kind === "place") {
      return {
        kind: "place",
        place: infoShow.place,
        position: {
          lat: parseFloat(infoShow.place.lat),
          lng: parseFloat(infoShow.place.lon),
        },
      };
    }
    if (infoShow.kind === "coordinate" && infoShow.position) {
      return {
        kind: "coordinate",
        address: infoShow.address,
        position: infoShow.position,
      };
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

  const isPlace = infoShow.kind === "place";
  const place = isPlace ? infoShow.place : null;

  const a11yChecklist = useMemo(() => {
    const items: { key: string; label: string; available: boolean }[] = [];
    const hasBathroom = nearbyBathrooms.length > 0;
    const hasElevator = nearbyMetro.length > 0;

    const osmWheelchair = osmDetail?.wheelchair;
    const osmTags = osmDetail?.tags;
    const osmFacilities = osmDetail?.facilities;

    if (osmWheelchair) {
      items.push({
        key: "wheelchair",
        label: t("wheelchairAccess"),
        available: osmWheelchair === "yes" || osmWheelchair === "limited",
      });
    } else if (isPlace && place) {
      const tags = (place as Record<string, unknown>).extratags as
        | Record<string, string>
        | undefined;
      const wheelchair =
        tags?.wheelchair || (place as Record<string, unknown>).wheelchair;
      items.push({
        key: "wheelchair",
        label: t("wheelchairAccess"),
        available: wheelchair === "yes" || wheelchair === "limited",
      });
    } else {
      items.push({
        key: "wheelchair",
        label: t("wheelchairAccess"),
        available: false,
      });
    }

    const facilityCategories = new Set(osmFacilities?.map((f) => f.category));
    const hasOsmElevator = facilityCategories.has("elevator");
    const hasOsmRamp =
      facilityCategories.has("ramp") || facilityCategories.has("kerb_cut");
    const hasOsmToilet = facilityCategories.has("toilet");
    const hasOsmTactile = osmTags?.tactile_paving === "yes";

    items.push(
      {
        key: "elevator",
        label: t("hasElevator"),
        available: hasElevator || hasOsmElevator,
      },
      {
        key: "ramp",
        label: t("hasRamp"),
        available: hasElevator || hasOsmRamp,
      },
      {
        key: "toilet",
        label: t("hasAccessibleToilet"),
        available: hasBathroom || hasOsmToilet,
      },
    );

    if (hasOsmTactile) {
      items.push({
        key: "tactile",
        label: t("hasTactilePaving"),
        available: true,
      });
    }

    return items;
  }, [isPlace, place, nearbyBathrooms, nearbyMetro, osmDetail, t]);

  const handleFlyTo = useCallback(
    (lng: number, lat: number, zoom = 17) => {
      if (map) map.flyTo({ center: [lng, lat], zoom });
    },
    [map],
  );

  const bathroomsSliced = useMemo(
    () => nearbyBathrooms.slice(0, 4),
    [nearbyBathrooms],
  );
  const metroSliced = useMemo(() => nearbyMetro.slice(0, 4), [nearbyMetro]);

  const placeIdForReview =
    isPlace && place
      ? place.osm_id
        ? `${place.osm_type}_${place.osm_id}`
        : place.place_id?.toString() || ""
      : placePosition
        ? `${placePosition.lat}_${placePosition.lng}`
        : "";

  if (!infoShow.kind) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const name = isPlace ? place!.name || place!.display_name : infoShow.address;
  const address = isPlace ? place!.display_name : infoShow.address;
  const addressParts = isPlace && place!.address ? place!.address : null;
  const hasA11y = nearbyBathrooms.length > 0 || nearbyMetro.length > 0;

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
          <div className="flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 mb-0.5">
            <MapPin className="h-3.5 w-3.5" />
            {t("placeInfoLabel")}
          </div>
          <h1 className="text-lg font-bold leading-tight line-clamp-2">
            {name}
          </h1>
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
            <Badge
              variant="outline"
              className="rounded-full gap-1 cursor-pointer hover:bg-muted"
            >
              <ExternalLink className="h-3 w-3" />
              {t("viewOnOSM")}
            </Badge>
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handlePlanRoute} className="flex-1 rounded-xl h-11">
          <Navigation className="h-4 w-4 mr-1.5" />
          {t("planRoute")}
        </Button>
        <Button
          onClick={handleToggleSave}
          variant={saved ? "default" : "outline"}
          size="icon"
          className="rounded-xl h-11 w-11 shrink-0"
        >
          {saved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
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

      {/* Address Details */}
      {addressParts && (
        <section className="rounded-xl bg-muted/30 p-3 space-y-1.5">
          <h2 className="text-sm font-semibold flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {t("addressInfo")}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {addressParts.road && (
              <div>
                <span className="text-muted-foreground">{t("road")}:</span>{" "}
                {addressParts.road}
              </div>
            )}
            {(addressParts.suburb || addressParts.neighbourhood) && (
              <div>
                <span className="text-muted-foreground">{t("district")}:</span>{" "}
                {addressParts.suburb || addressParts.neighbourhood}
              </div>
            )}
            {(addressParts.city ||
              addressParts.town ||
              addressParts.county) && (
              <div>
                <span className="text-muted-foreground">{t("city")}:</span>{" "}
                {addressParts.city || addressParts.town || addressParts.county}
              </div>
            )}
            {addressParts.postcode && (
              <div>
                <span className="text-muted-foreground">{t("postcode")}:</span>{" "}
                {addressParts.postcode}
              </div>
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
            {bathroomsSliced.map((b) => (
              <button
                key={b._id}
                type="button"
                onClick={() => handleFlyTo(b.longitude, b.latitude)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <DoorOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {b.address}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {t("accessibleToilet")}
                </Badge>
              </button>
            ))}
            {metroSliced.map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() =>
                  handleFlyTo(
                    parseFloat(String(m.經度)),
                    parseFloat(String(m.緯度)),
                  )
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <ArrowUpDown className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m["出入口電梯/無障礙坡道名稱"]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t("elevator")} · {m.出入口編號}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {t("elevator")}
                </Badge>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-2">
            {t("noNearbyA11y")}
          </p>
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

      {/* OSM Accessibility Detail */}
      {osmDetail &&
        (osmDetail.wheelchairDescription ||
          (osmDetail.facilities && osmDetail.facilities.length > 0)) && (
          <section className="rounded-xl bg-muted/30 p-3 space-y-2">
            <h2 className="text-sm font-semibold flex items-center gap-1.5">
              <Accessibility className="h-4 w-4 text-muted-foreground" />
              {t("osmAccessibilityInfo")}
            </h2>
            {osmDetail.wheelchair && (
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    osmDetail.wheelchair === "yes"
                      ? "default"
                      : osmDetail.wheelchair === "limited"
                        ? "secondary"
                        : "outline"
                  }
                  className="rounded-full"
                >
                  {osmDetail.wheelchair === "yes"
                    ? t("wheelchairYes")
                    : osmDetail.wheelchair === "limited"
                      ? t("wheelchairLimited")
                      : t("wheelchairNo")}
                </Badge>
              </div>
            )}
            {osmDetail.wheelchairDescription && (
              <p className="text-sm text-muted-foreground">
                {osmDetail.wheelchairDescription}
              </p>
            )}
            {osmDetail.facilities && osmDetail.facilities.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("osmFacilities")}
                </p>
                {osmDetail.facilities.slice(0, 6).map((f) => (
                  <button
                    key={f.osmId}
                    type="button"
                    onClick={() => {
                      if (f.location)
                        handleFlyTo(
                          f.location.coordinates[0],
                          f.location.coordinates[1],
                          18,
                        );
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-left text-sm"
                  >
                    <Accessibility className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{f.name || f.category}</span>
                    {f.wheelchair && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-xs shrink-0 rounded-full"
                      >
                        {f.wheelchair}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

      {/* Reviews */}
      {placeIdForReview && (
        <PlaceReviewSection osmId={placeIdForReview} placeType="osm" />
      )}
    </div>
  );
}
