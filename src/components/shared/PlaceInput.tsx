"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { LoaderCircle, SearchIcon, XIcon } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useCallback, useState } from "react";
import usePlacePredictions from "@/hook/usePlacePredictions";
import { cn, getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import { Button } from "../ui/button";
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
  const placesLib = useMapsLibrary("places");

  const [open, setOpen] = useState(false);
  const { searchHistory, addSearchHistory } = useMapStore();
  const { suggestions, loading } = usePlacePredictions((value as string) || "");

  const handlePlaceSubmit = useCallback(
    async (text: string) => {
      if (!placesLib) return;
      const { Place } = placesLib;
      const places = await Place.searchByText({
        fields: ["*"],
        textQuery: text,
      });
      const latLng = getLocation(places.places[0]);
      if (!latLng) return;
      addSearchHistory({
        kind: "place",
        place: places.places[0],
        position: latLng,
      });
      return places.places[0];
    },
    [placesLib, addSearchHistory]
  );

  const handlePlaceClick = useCallback(
    async (place: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !place.placePrediction) return;

      const placeDetails = place.placePrediction.toPlace();
      await placeDetails.fetchFields({ fields: ["*"] });
      console.log(placeDetails.toJSON());
      const latLng = getLocation(placeDetails);
      if (!latLng) return;
      addSearchHistory({
        kind: "place",
        place: placeDetails,
        position: latLng,
      });
      onPlaceSelect({ kind: "place", place: placeDetails, position: latLng });

      setOpen(false);
    },
    [onPlaceSelect, placesLib, addSearchHistory]
  );

  const handleHistoryClick = useCallback(
    async (place: PlaceDetail) => {
      if (!placesLib) return;
      const { Place } = placesLib;
      if (place.kind === "place") {
        const newPlace = new Place({ id: place.place.id });
        await newPlace.fetchFields({ fields: ["*"] });
        const latLng = getLocation(newPlace);
        if (!latLng) return;
        onPlaceSelect({
          kind: "place",
          place: newPlace,
          position: latLng,
        });
      }

      setOpen(false);
    },
    [onPlaceSelect, placesLib]
  );

  return (
    <div
      className={cn(
        " relative w-full bg-background px-3 py-1  pointer-events-auto rounded-t-3xl",
        !open && "rounded-3xl"
      )}
    >
      <div className={cn("w-full flex items-center gap-2 px-2")}>
        <SearchIcon size={20} className=" text-muted-foreground/70" />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const place = await handlePlaceSubmit(value as string);
            if (place) {
              const latLng = getLocation(place);
              if (!latLng) return;
              onPlaceSelect({
                kind: "place",
                place: place,
                position: latLng,
              });
            }
            setOpen(false);
          }}
          className="flex-1"
        >
          <Input
            type={type}
            placeholder={placeholder}
            tabIndex={0}
            className={cn(
              "  shadow-none   ring-transparent focus-visible:ring-transparent",
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
              <CommandGroup heading="搜尋歷史紀錄">
                {searchHistory.map((history) => {
                  if (history.kind === "place") {
                    const { place } = history;
                    return (
                      <CommandItem
                        itemType="button"
                        onSelect={() => {
                          handleHistoryClick(history);
                        }}
                        key={place.id}
                        className=" flex justify-between rounded-3xl items-center"
                      >
                        <span className=" p-1 text-start">
                          <p>{place.displayName}</p>
                          <p className=" text-sm  text-muted-foreground/70">
                            {place.formattedAddress}
                          </p>
                        </span>
                        <Button
                          onClick={() => {
                            console.log("Delete", place.id);
                          }}
                          variant={"ghost"}
                        >
                          <XIcon />
                        </Button>
                      </CommandItem>
                    );
                  }
                  return null;
                })}
              </CommandGroup>
            )}
            {value !== "" && open && (
              <CommandGroup heading="搜尋結果：">
                {suggestions.map((suggestion) => {
                  return (
                    <CommandItem
                      itemType="button"
                      onSelect={() => {
                        handlePlaceClick(suggestion);
                      }}
                      key={suggestion.placePrediction?.placeId}
                      className="block rounded-3xl"
                    >
                      <p>{suggestion.placePrediction?.mainText?.text}</p>
                      <p className=" text-sm  text-muted-foreground/70">
                        {suggestion.placePrediction?.secondaryText?.text}
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
