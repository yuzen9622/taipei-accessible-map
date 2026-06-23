"use client";
import { CrosshairIcon, LoaderCircle } from "lucide-react";
import Image from "next/image";
import type { InputHTMLAttributes } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import usePlacePredictions from "@/hook/usePlacePredictions";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import type { NominatimPlace, PlaceDetail } from "@/types";

import { Command, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { Input } from "../ui/input";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  onPlaceSelect: (places: PlaceDetail) => void;
};

function PlaceInput({
  onPlaceSelect,
  type = "search",
  className,
  placeholder = "今天想去哪兒...",
  value,
  onChange,
  ...props
}: InputProps) {
  const { t } = useAppTranslation("translation");
  const [open, setOpen] = useState(false);
  const { searchHistory, addSearchHistory, userLocation } = useMapStore();
  const { suggestions, loading } = usePlacePredictions((value as string) || "");
  const { userConfig } = useAuthStore();

  const handlePlaceSubmit = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        const lang = userConfig.language === "zh-TW" ? "zh" : "en";
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&countrycodes=tw&limit=1&accept-language=${lang}&addressdetails=1`
        );
        const data: NominatimPlace[] = await res.json();
        if (data.length === 0) return null;
        const place = data[0];
        const position = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
        const placeDetail: PlaceDetail = { kind: "place", place, position };
        addSearchHistory(placeDetail);
        return placeDetail;
      } catch {
        return null;
      }
    },
    [addSearchHistory, userConfig.language]
  );

  const handlePlaceClick = useCallback(
    (place: NominatimPlace) => {
      const position = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
      const placeDetail: PlaceDetail = { kind: "place", place, position };
      addSearchHistory(placeDetail);
      onPlaceSelect(placeDetail);
      setOpen(false);
    },
    [onPlaceSelect, addSearchHistory]
  );

  const handleHistoryClick = useCallback(
    (history: PlaceDetail) => {
      onPlaceSelect(history);
      setOpen(false);
    },
    [onPlaceSelect]
  );

  const handleNowClick = async (loc?: { lat: number; lng: number }) => {
    if (!loc) {
      toast.error("無法取得目前位置");
      return;
    }
    try {
      const lang = userConfig.language === "zh-TW" ? "zh" : "en";
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&accept-language=${lang}`
      );
      const data: NominatimPlace = await res.json();
      const placeDetail: PlaceDetail = {
        kind: "place",
        place: data,
        position: loc,
      };
      onPlaceSelect(placeDetail);
      addSearchHistory(placeDetail);
      setOpen(false);
    } catch {
      toast.error("無法取得位置資訊");
    }
  };

  return (
    <div
      className={cn(
        " relative w-full bg-card px-3 py-1  pointer-events-auto rounded-t-3xl",
        !open && "rounded-3xl"
      )}
    >
      <div className={cn("w-full flex items-center gap-2 px-2")}>
        <Image src={"/logo.webp"} width={20} height={20} alt="search" />
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
              className
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
          <CommandList>
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
                  <span className=" p-1 text-start flex items-center gap-2">
                    <CrosshairIcon className=" text-muted-foreground/70" />
                    <h1 className="text-lg font-semibold">目前位置</h1>
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
                        key={`${place.place_id}-${idx}`}
                        className=" flex justify-between rounded-3xl items-center"
                      >
                        <span className=" p-1 text-start">
                          <p>{place.name || place.display_name}</p>
                          <p className=" text-sm  text-muted-foreground/70">
                            {place.display_name}
                          </p>
                        </span>
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
                  return (
                    <CommandItem
                      itemType="button"
                      onSelect={() => {
                        handlePlaceClick(suggestion);
                      }}
                      key={suggestion.place_id}
                      className="block rounded-3xl"
                    >
                      <p>{suggestion.name || suggestion.display_name}</p>
                      <p className=" text-sm  text-muted-foreground/70">
                        {suggestion.display_name}
                      </p>
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
