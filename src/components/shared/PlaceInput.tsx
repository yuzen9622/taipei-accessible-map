"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { LoaderCircle, SearchIcon } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { useCallback, useState } from "react";
import usePlacePredictions from "@/hook/usePlacePredictions";
import { cn } from "@/lib/utils";
import { Command, CommandGroup, CommandItem, CommandList } from "../ui/command";
import { Input } from "../ui/input";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  onPlaceSelect: (places: google.maps.places.Place) => void;
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
  const { suggestions, loading } = usePlacePredictions((value as string) || "");

  const handlePlaceSubmit = useCallback(
    async (text: string) => {
      if (!placesLib) return;
      const { Place } = placesLib;
      const places = await Place.searchByText({
        fields: ["*"],
        textQuery: text,
      });

      return places.places[0];
    },
    [placesLib]
  );

  const handlePlaceClick = useCallback(
    async (place: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !place.placePrediction) return;

      const placeDetails = place.placePrediction.toPlace();
      await placeDetails.fetchFields({ fields: ["*"] });
      console.log(placeDetails);
      onPlaceSelect(placeDetails);

      setOpen(false);
    },
    [onPlaceSelect, placesLib]
  );

  return (
    <div
      className={cn(
        " relative w-full bg-background px-3 py-1  rounded-t-3xl",
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
              onPlaceSelect(place);
            }
            setOpen(false);
          }}
          className="flex-1"
        >
          <Input
            type={type}
            placeholder={placeholder}
            className={cn(
              "  shadow-none  ring-transparent focus-visible:ring-transparent",
              className
            )}
            value={value}
            onChange={(e) => {
              onChange?.(e);
              setOpen(true);
              if (e.target.value === "") setOpen(false);
            }}
            {...props}
          />
        </form>
        {loading && (
          <LoaderCircle className=" text-muted-foreground/50 animate-spin" />
        )}
      </div>
      <div className=" absolute inset-0 z-10 top-10/12">
        <Command className="w-full  shadow relative h-fit overflow-auto rounded-b-3xl">
          <CommandList>
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
                      className="block"
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
