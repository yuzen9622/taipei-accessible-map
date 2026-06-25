"use client";

import {
  Bookmark,
  MapPin,
  Navigation,
  Trash2,
  X,
} from "lucide-react";
import { useCallback } from "react";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";

function SavedPlaceCard({
  item,
  onNavigate,
  onRemove,
}: {
  item: PlaceDetail;
  onNavigate: (item: PlaceDetail) => void;
  onRemove: (item: PlaceDetail) => void;
}) {
  const { t } = useAppTranslation();
  const name =
    item.kind === "place"
      ? item.place.name || item.place.display_name
      : item.address;
  const address =
    item.kind === "place" ? item.place.display_name : undefined;

  return (
    <div className="group p-3 rounded-xl bg-muted/40 border border-border/30 hover:bg-muted/60 transition-colors">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <MapPin className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          {address && name !== address && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {address}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2.5 pl-12">
        <button
          type="button"
          onClick={() => onNavigate(item)}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
          aria-label={`${t("viewOnMap")} ${name}`}
        >
          <Navigation className="h-3 w-3" />
          {t("viewOnMap")}
        </button>
        <button
          type="button"
          onClick={() => onRemove(item)}
          className="flex items-center gap-1.5 text-xs text-destructive/70 hover:text-destructive font-medium ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`${t("unsavePlace")} ${name}`}
        >
          <Trash2 className="h-3 w-3" />
          {t("unsavePlace")}
        </button>
      </div>
    </div>
  );
}

export default function SavedPlacesPanel({ onClose }: { onClose: () => void }) {
  const { t } = useAppTranslation();
  const {
    savedPlaces,
    removeSavedPlace,
    map,
    setSearchPlace,
    setInfoShow,
    setSheetMode,
  } = useMapStore();

  const handleNavigate = useCallback(
    (item: PlaceDetail) => {
      setSearchPlace(item);
      if (item.kind === "place") {
        setInfoShow({ isOpen: true, kind: "place", place: item.place });
        if (map) map.flyTo({ center: [item.position.lng, item.position.lat], zoom: 17 });
      } else if (item.kind === "coordinate") {
        setInfoShow({ isOpen: true, kind: "coordinate", address: item.address, position: item.position });
        if (map) map.flyTo({ center: [item.position.lng, item.position.lat], zoom: 17 });
      }
      setSheetMode("place");
    },
    [map, setSearchPlace, setInfoShow, setSheetMode]
  );

  const handleRemove = useCallback(
    (item: PlaceDetail) => {
      removeSavedPlace(item);
    },
    [removeSavedPlace]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Bookmark className="h-4.5 w-4.5 text-primary" />
          {t("savedPlaces")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
          aria-label={t("close")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Count */}
      {savedPlaces.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("savedPlacesCount", { count: savedPlaces.length })}
        </p>
      )}

      {/* List */}
      {savedPlaces.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{t("noSavedPlaces")}</p>
          <p className="text-xs text-muted-foreground/70">{t("noSavedPlacesHint")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {savedPlaces.map((item, idx) => (
            <SavedPlaceCard
              key={idx}
              item={item}
              onNavigate={handleNavigate}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
