"use client";
import {
  Bath,
  Bike,
  Building,
  Building2,
  Bus,
  Coffee,
  Hospital,
  LoaderCircle,
  MapPin,
  Milestone,
  Navigation,
  School,
  Sparkles,
  Store,
  Train,
  TreePine,
  Utensils,
} from "lucide-react";
import Image from "next/image";
import type { InputHTMLAttributes } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import usePlacePredictions from "@/hook/usePlacePredictions";
import { useAppTranslation } from "@/i18n/client";
import { cn, formatNominatimPlace } from "@/lib/utils";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import type { NominatimPlace, PlaceDetail } from "@/types";
import { Command, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { Input } from "../ui/input";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  onPlaceSelect: (places: PlaceDetail) => void;
  hideIcon?: boolean;
};

function getPlaceIcon(category?: string, type?: string) {
  // 1. Check specific type first
  if (type) {
    if (
      type === "train_station" ||
      type === "station" ||
      type === "subway" ||
      type === "subway_entrance" ||
      type === "tram_stop"
    ) {
      return Train;
    }
    if (type === "bus_stop" || type === "bus_station" || type === "bus") {
      return Bus;
    }
    if (type === "bicycle_rental" || type === "share_bicycle") {
      return Bike;
    }
    if (
      type === "restaurant" ||
      type === "food_court" ||
      type === "fast_food"
    ) {
      return Utensils;
    }
    if (type === "cafe" || type === "pub" || type === "bar") {
      return Coffee;
    }
    if (
      type === "supermarket" ||
      type === "convenience" ||
      type === "mall" ||
      type === "department_store" ||
      type === "shop"
    ) {
      return Store;
    }
    if (
      type === "hospital" ||
      type === "clinic" ||
      type === "doctors" ||
      type === "pharmacy"
    ) {
      return Hospital;
    }
    if (
      type === "school" ||
      type === "university" ||
      type === "college" ||
      type === "kindergarten"
    ) {
      return School;
    }
    if (
      type === "park" ||
      type === "garden" ||
      type === "nature_reserve" ||
      type === "recreation_ground"
    ) {
      return TreePine;
    }
    if (type === "toilets" || type === "shower") {
      return Bath;
    }
  }

  // 2. Fallback to category (class)
  if (category) {
    switch (category) {
      case "railway":
        return Train;
      case "highway":
        if (type === "bus_stop" || type === "bus_station") return Bus;
        return Milestone;
      case "amenity":
        return Building;
      case "shop":
        return Store;
      case "tourism":
      case "leisure":
        return Sparkles;
      case "building":
        return Building2;
      default:
        return MapPin;
    }
  }

  return MapPin;
}

function PlaceInput({
  onPlaceSelect,
  type = "search",
  className,
  placeholder = "今天想去哪兒...",
  value,
  onChange,
  hideIcon,
  ...props
}: InputProps) {
  const { t } = useAppTranslation("translation");
  const [open, setOpen] = useState(false);
  const { searchHistory, addSearchHistory, userLocation } = useMapStore(
    useShallow((s) => ({
      searchHistory: s.searchHistory,
      addSearchHistory: s.addSearchHistory,
      userLocation: s.userLocation,
    })),
  );
  const { suggestions, loading } = usePlacePredictions((value as string) || "");
  const { userConfig } = useAuthStore(
    useShallow((s) => ({ userConfig: s.userConfig })),
  );

  const handlePlaceSubmit = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        const lang = userConfig.language === "zh-TW" ? "zh" : "en";
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=tw&limit=1&accept-language=${lang}&addressdetails=1`,
        );
        const data: NominatimPlace[] = await res.json();
        if (data.length === 0) return null;
        const place = formatNominatimPlace(data[0], userConfig.language);
        const position = {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon),
        };
        const placeDetail: PlaceDetail = { kind: "place", place, position };
        addSearchHistory(placeDetail);
        return placeDetail;
      } catch {
        return null;
      }
    },
    [addSearchHistory, userConfig.language],
  );

  const handlePlaceClick = useCallback(
    (place: NominatimPlace) => {
      const position = {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
      };
      const placeDetail: PlaceDetail = { kind: "place", place, position };
      addSearchHistory(placeDetail);
      onPlaceSelect(placeDetail);
      setOpen(false);
    },
    [onPlaceSelect, addSearchHistory],
  );

  const handleHistoryClick = useCallback(
    (history: PlaceDetail) => {
      onPlaceSelect(history);
      setOpen(false);
    },
    [onPlaceSelect],
  );

  const handleNowClick = async (loc?: { lat: number; lng: number }) => {
    if (!loc) {
      toast.error("無法取得目前位置");
      return;
    }
    const placeDetail: PlaceDetail = {
      kind: "coordinate",
      address: "你的位置",
      position: loc,
    };
    onPlaceSelect(placeDetail);
    setOpen(false);
  };

  return (
    <div
      className={cn(
        "relative w-full pointer-events-auto",
        hideIcon
          ? "bg-transparent px-1 py-0.5"
          : cn("bg-card px-3 py-1 rounded-t-3xl", !open && "rounded-3xl"),
      )}
    >
      <div className={cn("w-full flex items-center gap-2 px-2")}>
        {!hideIcon && (
          <Image src={"/logo.webp"} width={20} height={20} alt="search" />
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const placeDetail = await handlePlaceSubmit(value as string);
            if (placeDetail) {
              onPlaceSelect(placeDetail);
            }
            setOpen(false);
          }}
          className="flex-1 "
        >
          <Input
            type={type}
            placeholder={placeholder}
            tabIndex={0}
            className={cn(
              "  shadow-none  bg-transparent! h-fit ring-transparent focus-visible:ring-transparent",
              className,
            )}
            value={value}
            onChange={(e) => {
              onChange?.(e);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                setOpen(false);
              }, 100);
            }}
            {...props}
          />
        </form>
        {loading && (
          <LoaderCircle className=" text-muted-foreground/50 animate-spin" />
        )}
      </div>
      <div className=" absolute inset-0 z-10 top-10/12">
        <Command className="w-full  text-start   shadow relative h-fit overflow-auto rounded-b-3xl">
          <CommandList onMouseDown={(e) => e.preventDefault()}>
            {value === "" && open && (
              <CommandGroup heading={t("searchHistory")}>
                <CommandItem
                  itemType="button"
                  onSelect={() => {
                    handleNowClick(userLocation ?? void 0);
                  }}
                  key={"now_location"}
                  className=" flex justify-between rounded-3xl items-center"
                >
                  <span className="p-1 text-start flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                    <Navigation className="w-5 h-5" />
                    <span className="text-base font-medium">你的位置</span>
                  </span>
                </CommandItem>
                {searchHistory.map((history, idx) => {
                  if (history.kind === "place") {
                    const { place } = history;
                    const Icon = getPlaceIcon(
                      place.class || place.category,
                      place.type,
                    );
                    return (
                      <CommandItem
                        itemType="button"
                        onSelect={() => {
                          handleHistoryClick(history);
                        }}
                        key={`${place.place_id}-${idx}`}
                        className="flex items-start gap-3 rounded-3xl p-2 cursor-pointer transition-colors"
                      >
                        <div className="mt-1 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 text-start">
                          <p className="font-medium text-foreground truncate">
                            {place.name || place.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground/70 truncate">
                            {place.display_name}
                          </p>
                        </div>
                      </CommandItem>
                    );
                  }
                  return null;
                })}
              </CommandGroup>
            )}
            {value !== "" && open && (
              <CommandGroup heading={t("searchResults")}>
                {suggestions.map((suggestion) => {
                  const Icon = getPlaceIcon(
                    suggestion.class || suggestion.category,
                    suggestion.type,
                  );
                  return (
                    <CommandItem
                      itemType="button"
                      onSelect={() => {
                        handlePlaceClick(suggestion);
                      }}
                      key={suggestion.place_id}
                      className="flex items-start gap-3 rounded-3xl p-2 cursor-pointer transition-colors"
                    >
                      <div className="mt-1 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 text-start">
                        <p className="font-medium text-foreground truncate">
                          {suggestion.name || suggestion.display_name}
                        </p>
                        <p className="text-xs text-muted-foreground/70 truncate">
                          {suggestion.display_name}
                        </p>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
export default PlaceInput;
