"use client";

import {
  Accessibility,
  ArrowUpDown,
  ArrowUpRight,
  Clock,
  DoorOpen,
  MapPin,
} from "lucide-react";
import { useCallback, useState } from "react";
import PlaceInput from "@/components/shared/PlaceInput";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import { A11yEnum, type PlaceDetail } from "@/types";
import { Badge } from "../ui/badge";

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
  } = useMapStore();
  const [input, setInput] = useState("");

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
      return Math.sqrt(dx * dx + dy * dy) < 0.02;
    })
    .slice(0, 6);

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

      {/* A11y Quick Chips */}
      <div className="flex gap-2">
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
                    {place.content?.title || "無障礙設施"}
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
