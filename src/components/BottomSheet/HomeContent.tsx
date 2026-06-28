"use client";

import {
  Accessibility,
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  Bookmark,
  Bus,
  CircleParking,
  Clock,
  Cloud,
  DoorOpen,
  Heart,
  MapPin,
  Navigation,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import PlaceInput from "@/components/shared/PlaceInput";
import { useAppTranslation } from "@/i18n/client";
import { getNearbyHazardReports } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import { A11yEnum, type PlaceDetail } from "@/types";
import type { HazardReport } from "@/types/route";
import { Badge } from "../ui/badge";
import BusPanel from "./BusPanel";
import EnvironmentPanel from "./EnvironmentPanel";
import HazardReportPanel from "./HazardReportPanel";
import ParkingPanel from "./ParkingPanel";
import SavedPlacesPanel from "./SavedPlacesPanel";
import WelfarePanel from "./WelfarePanel";

type SubPanel = "none" | "environment" | "hazard" | "welfare" | "parking" | "bus" | "saved";

export default function HomeContent() {
  const { t } = useAppTranslation();
  const {
    setSearchPlace,
    setInfoShow,
    map,
    searchHistory,
    setSheetMode,
    toggleA11yType,
    selectedA11yTypes,
    a11yPlaces,
    userLocation,
    savedPlaces,
  } = useMapStore();
  const [input, setInput] = useState("");
  const [subPanel, setSubPanel] = useState<SubPanel>("none");
  const [nearbyHazards, setNearbyHazards] = useState<HazardReport[]>([]);

  useEffect(() => {
    if (!userLocation) return;
    getNearbyHazardReports(userLocation.lat, userLocation.lng, 500)
      .then((res) => {
        if (res.ok && res.data?.reports) setNearbyHazards(res.data.reports);
      })
      .catch(() => {});
  }, [userLocation]);

  const handlePlaceChange = useCallback(
    (placeDetail: PlaceDetail) => {
      setSearchPlace(placeDetail);
      if (placeDetail.kind === "place") {
        setInput(placeDetail.place.name || placeDetail.place.display_name || "");
        setInfoShow({
          isOpen: true,
          kind: "place",
          place: placeDetail.place,
        });
        if (map) map.flyTo({ center: [placeDetail.position.lng, placeDetail.position.lat] });
      } else if (placeDetail.kind === "coordinate") {
        setInput(placeDetail.address || "");
        setInfoShow({
          isOpen: true,
          kind: "coordinate",
          address: placeDetail.address,
          position: placeDetail.position,
        });
        if (map) map.flyTo({ center: [placeDetail.position.lng, placeDetail.position.lat] });
      }
      setSheetMode("place");
    },
    [setSearchPlace, setInfoShow, map, setSheetMode]
  );

  const a11yChips = [
    { type: A11yEnum.ELEVATOR, Icon: ArrowUpDown, label: t("elevator") },
    { type: A11yEnum.RAMP, Icon: Accessibility, label: t("ramp") },
    { type: A11yEnum.RESTROOM, Icon: DoorOpen, label: t("toilet") },
  ];

  const nearbyPlaces = a11yPlaces
    ?.filter((p) => {
      if (!userLocation) return false;
      const dx = p.position.lat - userLocation.lat;
      const dy = p.position.lng - userLocation.lng;
      return dx * dx + dy * dy < 0.0004;
    })
    .slice(0, 6);

  if (subPanel === "environment") {
    return <EnvironmentPanel onClose={() => setSubPanel("none")} />;
  }
  if (subPanel === "hazard") {
    return <HazardReportPanel onClose={() => setSubPanel("none")} />;
  }
  if (subPanel === "welfare") {
    return <WelfarePanel onClose={() => setSubPanel("none")} />;
  }
  if (subPanel === "parking") {
    return <ParkingPanel onClose={() => setSubPanel("none")} />;
  }
  if (subPanel === "bus") {
    return <BusPanel onClose={() => setSubPanel("none")} />;
  }
  if (subPanel === "saved") {
    return <SavedPlacesPanel onClose={() => setSubPanel("none")} />;
  }

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="w-full rounded-2xl shadow-sm border border-border/50 overflow-visible">
        <PlaceInput
          className="border-none"
          value={input}
          onChange={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder={t("searchPlaceHolder")}
          onPlaceSelect={handlePlaceChange}
        />
      </div>

      {/* Route Planning Entry */}
      <button
        type="button"
        onClick={() => setSheetMode("plan")}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-colors text-left"
      >
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Navigation className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{t("planRoute")}</p>
          <p className="text-xs text-muted-foreground">{t("planRouteDesc")}</p>
        </div>
      </button>

      {/* A11y Quick Chips */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <Accessibility className="h-4 w-4" />
          {t("accessibleTitle")}
        </h2>
        <div className="flex gap-2 flex-wrap">
          {a11yChips.map((chip) => {
            const active = selectedA11yTypes.has(chip.type);
            return (
              <button
                key={chip.type}
                type="button"
                onClick={() => toggleA11yType(chip.type)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all
                  ${active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
              >
                <chip.Icon className="h-4 w-4" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Extra quick actions */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          {t("quickActions")}
        </h2>
        <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setSubPanel("environment")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
        >
          <Cloud className="h-4 w-4" />
          {t("environment")}
        </button>
        <button
          type="button"
          onClick={() => setSubPanel("hazard")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          <AlertTriangle className="h-4 w-4" />
          {t("reportHazard")}
        </button>
        <button
          type="button"
          onClick={() => setSubPanel("welfare")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
        >
          <Heart className="h-4 w-4" />
          {t("welfare")}
        </button>
        <button
          type="button"
          onClick={() => setSubPanel("parking")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 transition-colors"
        >
          <CircleParking className="h-4 w-4" />
          {t("parking")}
        </button>
        <button
          type="button"
          onClick={() => setSubPanel("bus")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <Bus className="h-4 w-4" />
          {t("busInfo")}
        </button>
        </div>
      </div>

      {/* Nearby Hazards */}
      {nearbyHazards.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t("nearbyHazards")}
          </h2>
          <div className="space-y-2">
            {nearbyHazards.slice(0, 3).map((hazard) => (
              <div
                key={hazard._id}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {t(hazard.hazardType === "data_error" ? "dataError" : hazard.hazardType)}
                  </p>
                  {hazard.description && (
                    <p className="text-xs text-muted-foreground truncate">{hazard.description}</p>
                  )}
                </div>
                <Badge
                  variant={hazard.status === "verified" ? "default" : "secondary"}
                  className="text-xs shrink-0"
                >
                  {hazard.status === "verified" ? t("confirmed") : t("pending")}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nearby A11y Facilities */}
      {nearbyPlaces && nearbyPlaces.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Accessibility className="h-4 w-4" />
            {t("nearbyA11y")}
          </h2>
          <div className="space-y-2">
            {nearbyPlaces.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  if (map) {
                    map.flyTo({
                      center: [place.position.lng, place.position.lat],
                      zoom: 17,
                    });
                  }
                }}
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
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Saved Places */}
      {savedPlaces.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Bookmark className="h-4 w-4" />
              {t("savedPlaces")}
            </h2>
            {savedPlaces.length > 3 && (
              <button
                type="button"
                onClick={() => setSubPanel("saved")}
                className="text-xs text-primary hover:underline font-medium"
              >
                {t("viewAll")}
              </button>
            )}
          </div>
          <div className="space-y-1">
            {savedPlaces.slice(0, 5).map((item, idx) => {
              const name =
                item.kind === "place"
                  ? item.place.name || item.place.display_name
                  : item.address;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePlaceChange(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
                >
                  <Bookmark className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Searches */}
      {searchHistory.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {t("recentSearches")}
          </h2>
          <div className="space-y-1">
            {searchHistory.slice(0, 5).map((item, idx) => {
              const name =
                item.kind === "place"
                  ? item.place.name || item.place.display_name
                  : item.address;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePlaceChange(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors text-left"
                >
                  <Clock className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                  <span className="text-sm truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
