"use client";

import {
  Accessibility,
  AlertTriangle,
  ArrowUpDown,
  ArrowUpRight,
  Bookmark,
  Bus,
  Check,
  CircleParking,
  Clock,
  Cloud,
  DoorOpen,
  GripVertical,
  Heart,
  MapPin,
  Navigation,
  Pencil,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PlaceInput from "@/components/shared/PlaceInput";
import useQuickActions from "@/hook/useQuickActions";
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

const ACTION_META: Record<string, { Icon: LucideIcon; labelKey: string; pillClass: string }> = {
  environment: {
    Icon: Cloud,
    labelKey: "environment",
    pillClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20",
  },
  hazard: {
    Icon: AlertTriangle,
    labelKey: "reportHazard",
    pillClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
  },
  parking: {
    Icon: CircleParking,
    labelKey: "parking",
    pillClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20",
  },
  bus: {
    Icon: Bus,
    labelKey: "busInfo",
    pillClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
  },
  welfare: {
    Icon: Heart,
    labelKey: "welfare",
    pillClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20",
  },
};

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
  const [editMode, setEditMode] = useState(false);
  const { actions, visibleActions, toggleVisibility, moveItem, reset } = useQuickActions();

  useEffect(() => {
    if (!userLocation) return;
    let cancelled = false;
    getNearbyHazardReports(userLocation.lat, userLocation.lng, 500)
      .then((res) => {
        if (!cancelled && res.ok && res.data?.reports) setNearbyHazards(res.data.reports);
      })
      .catch(() => {});
    return () => { cancelled = true; };
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

  const a11yChips = useMemo(() => [
    { type: A11yEnum.ELEVATOR, Icon: ArrowUpDown, label: t("elevator") },
    { type: A11yEnum.RAMP, Icon: Accessibility, label: t("ramp") },
    { type: A11yEnum.RESTROOM, Icon: DoorOpen, label: t("toilet") },
  ], [t]);

  const nearbyPlaces = useMemo(() => {
    if (!a11yPlaces || !userLocation) return [];
    return a11yPlaces
      .filter((p) => {
        const dx = p.position.lat - userLocation.lat;
        const dy = p.position.lng - userLocation.lng;
        return Math.sqrt(dx * dx + dy * dy) < 0.02;
      })
      .slice(0, 6);
  }, [a11yPlaces, userLocation]);

  if (subPanel === "environment") return <EnvironmentPanel onClose={() => setSubPanel("none")} />;
  if (subPanel === "hazard") return <HazardReportPanel onClose={() => setSubPanel("none")} />;
  if (subPanel === "welfare") return <WelfarePanel onClose={() => setSubPanel("none")} />;
  if (subPanel === "parking") return <ParkingPanel onClose={() => setSubPanel("none")} />;
  if (subPanel === "bus") return <BusPanel onClose={() => setSubPanel("none")} />;
  if (subPanel === "saved") return <SavedPlacesPanel onClose={() => setSubPanel("none")} />;

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
            const active = selectedA11yTypes.includes(chip.type);
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

      {/* Quick actions — customizable, pill-style colored buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            {t("quickActions")}
          </h2>
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            aria-label={t("editQuickActions")}
          >
            {editMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
        </div>

        {editMode ? (
          <QuickActionsEditor
            actions={actions}
            onToggle={toggleVisibility}
            onMove={moveItem}
            onReset={reset}
          />
        ) : (
          <div className="flex gap-2 flex-wrap">
            {visibleActions.map((action) => {
              const meta = ACTION_META[action.id];
              if (!meta) return null;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setSubPanel(action.id as SubPanel)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${meta.pillClass}`}
                >
                  <meta.Icon className="h-4 w-4" />
                  {t(meta.labelKey)}
                </button>
              );
            })}
          </div>
        )}
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
      {nearbyPlaces.length > 0 && (
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

function QuickActionsEditor({
  actions,
  onToggle,
  onMove,
  onReset,
}: {
  actions: { id: string; visible: boolean }[];
  onToggle: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onReset: () => void;
}) {
  const { t } = useAppTranslation();
  const dragItem = useRef<number | null>(null);

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
  };

  const handleDrop = (targetIdx: number) => {
    if (dragItem.current !== null && dragItem.current !== targetIdx) {
      onMove(dragItem.current, targetIdx);
    }
    dragItem.current = null;
  };

  const visibleCount = actions.filter((a) => a.visible).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("maxQuickActions")}</p>
      {actions.map((action, idx) => {
        const meta = ACTION_META[action.id];
        if (!meta) return null;
        const canEnable = action.visible || visibleCount < 4;
        return (
          <div
            key={action.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/30 bg-background cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            <meta.Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1">{t(meta.labelKey)}</span>
            <button
              type="button"
              onClick={() => canEnable && onToggle(action.id)}
              disabled={!canEnable && !action.visible}
              className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                action.visible
                  ? "bg-foreground border-foreground text-background"
                  : "border-border/60 hover:border-foreground/40"
              }`}
              aria-label={action.visible ? t("hide") : t("show")}
            >
              {action.visible && <Check className="h-3 w-3" />}
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-1"
      >
        <RotateCcw className="h-3 w-3" />
        {t("resetDefault")}
      </button>
    </div>
  );
}
