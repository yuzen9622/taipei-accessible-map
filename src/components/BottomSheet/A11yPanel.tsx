"use client";

import {
  Accessibility,
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  DoorOpen,
  MapPin,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getNearbyHazardReports } from "@/lib/api/a11y";
import { haversineMeters } from "@/lib/geo";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import { A11yEnum } from "@/types";
import { formatDistance, type HazardReport } from "@/types/route";
import { Badge } from "../ui/badge";

export default function A11yPanel({
  onClose,
  hideHeader,
}: {
  onClose?: () => void;
  hideHeader?: boolean;
}) {
  const { t } = useAppTranslation();
  const { map, userLocation, a11yPlaces, selectedA11yTypes, toggleA11yType } =
    useMapStore();
  const [nearbyHazards, setNearbyHazards] = useState<HazardReport[]>([]);

  useEffect(() => {
    if (!userLocation) return;
    const controller = new AbortController();
    getNearbyHazardReports(
      userLocation.lat,
      userLocation.lng,
      500,
      controller.signal,
    )
      .then((res) => {
        if (!controller.signal.aborted && res.ok && res.data?.reports)
          setNearbyHazards(res.data.reports);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [userLocation]);

  const a11yChips = [
    { type: A11yEnum.ELEVATOR, Icon: ArrowUpDown, label: t("elevator") },
    { type: A11yEnum.RAMP, Icon: Accessibility, label: t("ramp") },
    { type: A11yEnum.RESTROOM, Icon: DoorOpen, label: t("toilet") },
  ];

  const nearbyPlaces = useMemo(() => {
    if (!userLocation || !a11yPlaces) return [];
    return a11yPlaces
      .map((p) => ({
        place: p,
        distance: haversineMeters(userLocation, p.position),
      }))
      .filter((p) => p.distance < 2000)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);
  }, [a11yPlaces, userLocation]);

  const handleFlyToPlace = useCallback(
    (lng: number, lat: number) => {
      if (map) map.flyTo({ center: [lng, lat], zoom: 17 });
    },
    [map],
  );

  return (
    <div className="space-y-5">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Accessibility className="h-4.5 w-4.5 text-emerald-500" />
            {t("accessibleTitle")}
          </h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted"
              aria-label={t("close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Facility type filter — toggles map pins */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {t("a11yFilterHint")}
        </h3>
        <div className="flex gap-2 flex-wrap">
          {a11yChips.map((chip) => {
            const active = selectedA11yTypes.has(chip.type);
            return (
              <button
                key={chip.type}
                type="button"
                onClick={() => toggleA11yType(chip.type)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                <chip.Icon className="h-4 w-4" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nearby facilities with distance */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Accessibility className="h-4 w-4" />
          {t("nearbyA11y")}
        </h3>
        {nearbyPlaces.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t("noNearbyA11y")}
          </p>
        ) : (
          <div className="space-y-2">
            {nearbyPlaces.map(({ place, distance }) => (
              <button
                key={place.id}
                type="button"
                onClick={() =>
                  handleFlyToPlace(place.position.lng, place.position.lat)
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {place.content?.title || t("a11yDefaultTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {place.content?.desc || ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatDistance(distance)}
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Nearby hazards */}
      {nearbyHazards.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t("nearbyHazards")}
          </h3>
          <div className="space-y-2">
            {nearbyHazards.slice(0, 3).map((hazard) => (
              <div
                key={hazard._id}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {t(
                      hazard.hazardType === "data_error"
                        ? "dataError"
                        : hazard.hazardType,
                    )}
                  </p>
                  {hazard.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {hazard.description}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    hazard.status === "verified" ? "default" : "secondary"
                  }
                  className="text-xs shrink-0"
                >
                  {hazard.status === "verified" ? t("confirmed") : t("pending")}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
