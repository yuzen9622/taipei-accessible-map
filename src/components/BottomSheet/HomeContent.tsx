"use client";

import {
  AlertTriangle,
  Bookmark,
  Bus,
  ChevronDown,
  CircleParking,
  Clock,
  Cloud,
  Heart,
  Navigation,
  TrainFront,
} from "lucide-react";
import { useCallback, useState } from "react";
import PlaceInput from "@/components/shared/PlaceInput";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import A11yPanel from "./A11yPanel";
import BusPanel from "./BusPanel";
import EnvironmentPanel from "./EnvironmentPanel";
import HazardReportPanel from "./HazardReportPanel";
import ParkingPanel from "./ParkingPanel";
import SavedPlacesPanel from "./SavedPlacesPanel";
import WelfarePanel from "./WelfarePanel";

type SubPanel =
  | "none"
  | "a11y"
  | "environment"
  | "hazard"
  | "welfare"
  | "parking"
  | "bus"
  | "saved";

export default function HomeContent() {
  const { t } = useAppTranslation();
  const {
    setSearchPlace,
    setInfoShow,
    map,
    searchHistory,
    setSheetMode,
    setActiveRailPanel,
    savedPlaces,
  } = useMapStore();
  const [input, setInput] = useState("");
  const [subPanel, setSubPanel] = useState<SubPanel>("none");
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);

  const handlePlaceChange = useCallback(
    (placeDetail: PlaceDetail) => {
      setSearchPlace(placeDetail);
      if (placeDetail.kind === "place") {
        setInput(
          placeDetail.place.name || placeDetail.place.display_name || "",
        );
        setInfoShow({
          isOpen: true,
          kind: "place",
          place: placeDetail.place,
        });
        if (map)
          map.flyTo({
            center: [placeDetail.position.lng, placeDetail.position.lat],
          });
      } else if (placeDetail.kind === "coordinate") {
        setInput(placeDetail.address || "");
        setInfoShow({
          isOpen: true,
          kind: "coordinate",
          address: placeDetail.address,
          position: placeDetail.position,
        });
        if (map)
          map.flyTo({
            center: [placeDetail.position.lng, placeDetail.position.lat],
          });
      }
      setSheetMode("place");
    },
    [setSearchPlace, setInfoShow, map, setSheetMode],
  );

  // Metro accessibility lives in the dedicated a11y panel: switch the rail
  // panel on desktop, fall back to an inline sub-panel on mobile.
  const openA11y = useCallback(() => {
    setActiveRailPanel("a11y");
    setSubPanel("a11y");
  }, [setActiveRailPanel]);

  if (subPanel === "a11y") {
    return <A11yPanel onClose={() => setSubPanel("none")} />;
  }
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

      {/* Quick actions: the essentials up front, the rest behind 更多 */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          {t("quickActions")}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={openA11y}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors"
          >
            <TrainFront className="h-4 w-4" />
            {t("metroA11y")}
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
          <button
            type="button"
            onClick={() => setMoreActionsOpen(!moreActionsOpen)}
            aria-expanded={moreActionsOpen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-muted/60 text-muted-foreground hover:bg-muted transition-colors"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                moreActionsOpen && "rotate-180",
              )}
            />
            {t("railMore")}
          </button>
          {moreActionsOpen && (
            <>
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
                onClick={() => setSubPanel("welfare")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <Heart className="h-4 w-4" />
                {t("welfare")}
              </button>
            </>
          )}
        </div>
      </div>

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
