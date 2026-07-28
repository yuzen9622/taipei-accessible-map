"use client";
import {
  Bath,
  Bike,
  Building,
  Building2,
  Bus,
  Clock,
  Coffee,
  Hospital,
  LoaderCircle,
  MapPin,
  Milestone,
  Navigation,
  School,
  Search,
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
import { getPlaceAutocomplete, getPlaceDetails } from "@/lib/api/placeSearch";
import { toApiLang } from "@/lib/place/lang";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import type { AutocompleteItem, PlaceResult } from "@/types/place";
import { Command, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { Input } from "../ui/input";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  onPlaceSelect: (places: PlaceDetail) => void;
  hideIcon?: boolean;
  onSearchRequest?: (query: string) => void;
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
  onSearchRequest,
  ...props
}: InputProps) {
  const { t, i18n } = useAppTranslation("translation");
  const lang = toApiLang(i18n.language);
  const [open, setOpen] = useState(false);
  const { searchHistory, addSearchHistory, userLocation, map } = useMapStore(
    useShallow((s) => ({
      searchHistory: s.searchHistory,
      addSearchHistory: s.addSearchHistory,
      userLocation: s.userLocation,
      map: s.map,
    })),
  );
  const { suggestions, loading, sessionToken, resetSession } =
    usePlacePredictions((value as string) || "");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const resolvePlace = useCallback(
    async (item: AutocompleteItem) => {
      if (item.source === "osm" && item.location) {
        const [lng, lat] = item.location.coordinates;
        map?.flyTo({ center: [lng, lat], zoom: 17 });
      }

      const response = await getPlaceDetails(item.id, {
        sessiontoken: sessionToken,
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        lang,
      });
      if (!response.ok || !response.data) {
        throw new Error("Place details unavailable");
      }

      const place: PlaceResult = response.data;
      const [lng, lat] = place.location.coordinates;
      const placeDetail: PlaceDetail = {
        kind: "place",
        place,
        position: { lat, lng },
      };
      addSearchHistory(placeDetail);
      onPlaceSelect(placeDetail);
      setOpen(false);
      resetSession();
    },
    [
      addSearchHistory,
      lang,
      map,
      onPlaceSelect,
      resetSession,
      sessionToken,
      userLocation?.lat,
      userLocation?.lng,
    ],
  );

  const handlePlaceSubmit = useCallback(
    async (text: string) => {
      const query = text.trim();
      if (!query || pendingId) return;
      setPendingId("submit");
      try {
        const response = await getPlaceAutocomplete({
          q: query,
          sessiontoken: sessionToken,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
          limit: 1,
          lang,
        });
        const item = response.ok ? response.data?.[0] : undefined;
        if (!item) {
          toast.error("找不到符合的地點");
          return;
        }
        await resolvePlace(item);
      } catch {
        toast.error("無法取得地點詳細資料");
      } finally {
        setPendingId(null);
      }
    },
    [
      lang,
      pendingId,
      resolvePlace,
      sessionToken,
      userLocation?.lat,
      userLocation?.lng,
    ],
  );

  const handlePlaceClick = useCallback(
    async (item: AutocompleteItem) => {
      if (pendingId) return;
      setPendingId(item.id);
      try {
        await resolvePlace(item);
      } catch {
        toast.error("無法取得地點詳細資料");
      } finally {
        setPendingId(null);
      }
    },
    [pendingId, resolvePlace],
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
            await handlePlaceSubmit(value as string);
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
                    return (
                      <CommandItem
                        itemType="button"
                        onSelect={() => {
                          handleHistoryClick(history);
                        }}
                        key={`${place.id}-${idx}`}
                        className="flex items-start gap-3 rounded-3xl p-2 cursor-pointer transition-colors"
                      >
                        <div className="mt-1 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 text-start">
                          <p className="font-medium text-foreground truncate">
                            {place.name || place.fullAddress}
                          </p>
                          <p className="text-xs text-muted-foreground/70 truncate">
                            {place.fullAddress}
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
              <>
                <CommandGroup heading={t("searchResults")}>
                  {suggestions.map((suggestion) => {
                    const Icon = getPlaceIcon(
                      suggestion.placeClass ?? undefined,
                      suggestion.placeType ?? undefined,
                    );
                    return (
                      <CommandItem
                        itemType="button"
                        onSelect={() => {
                          void handlePlaceClick(suggestion);
                        }}
                        key={suggestion.id}
                        disabled={pendingId !== null}
                        className="flex items-start gap-3 rounded-3xl p-2 cursor-pointer transition-colors"
                      >
                        <div className="mt-1 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          {pendingId === suggestion.id ? (
                            <LoaderCircle className="h-4 w-4 text-primary animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-start">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground truncate">
                              {suggestion.primaryText}
                            </p>
                            {suggestion.typeLabel && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                                {suggestion.typeLabel}
                              </span>
                            )}
                          </div>
                          {suggestion.secondaryText && (
                            <p className="text-xs text-muted-foreground/70 truncate">
                              {suggestion.secondaryText}
                            </p>
                          )}
                          {suggestion.distanceMeters !== null && (
                            <p className="text-xs text-muted-foreground/70">
                              {Math.round(suggestion.distanceMeters)} m
                            </p>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                {onSearchRequest && (
                  <CommandGroup>
                    <CommandItem
                      itemType="button"
                      onSelect={() => {
                        onSearchRequest(value as string);
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-3xl p-2 cursor-pointer transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Search className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-primary">
                        {t("searchForQuery", { query: value })}
                      </span>
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
export default PlaceInput;
