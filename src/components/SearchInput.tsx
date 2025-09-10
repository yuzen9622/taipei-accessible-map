"use client";

import { LoaderCircle, SearchIcon } from "lucide-react";
import { useCallback, useState } from "react";

import usePlacePredictions from "@/hook/usePlacePredictions";
import { cn } from "@/lib/utils";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

import { Command, CommandGroup, CommandItem, CommandList } from "./ui/command";
import { Input } from "./ui/input";

import type { InputHTMLAttributes } from "react";
type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  onPlaceSelect: (places: google.maps.places.Place) => void;
};

function SearchInput({
  onPlaceSelect,
  type = "search",
  className,
  placeholder = "今天想去哪兒...",
  ...props
}: InputProps) {
  const placesLib = useMapsLibrary("places");
  const [searchInput, setSearchInput] = useState("");
  const [open, setOpen] = useState(false);
  const { suggestions, loading } = usePlacePredictions(searchInput);

  const handlePlaceClick = useCallback(
    async (place: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !place.placePrediction) return;

      setSearchInput(place.placePrediction.text.text);
      const placeDetails = place.placePrediction.toPlace();
      await placeDetails.fetchFields({ fields: ["*"] });
      console.log(placeDetails.displayName);
      onPlaceSelect(placeDetails);
      setOpen(false);
    },
    [onPlaceSelect, placesLib]
  );

  return (
    <div
      className={cn(
        " relative w-full bg-background p-2  rounded-t-2xl",
        !open && "rounded-2xl"
      )}
    >
      <div className="w-full flex items-center gap-2 px-2">
        <SearchIcon size={20} className=" text-muted-foreground/70" />
        <Input
          type={type}
          placeholder={placeholder}
          className={cn(
            "flex-1 border-none outline-none shadow-none  ring-transparent focus-visible:ring-transparent",
            className
          )}
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setOpen(true);
            if (e.target.value === "") setOpen(false);
          }}
          {...props}
        />
        {loading && (
          <LoaderCircle className=" text-muted-foreground/50 animate-spin" />
        )}
      </div>
      <div className=" absolute inset-0 z-10 top-10/12">
        <Command className="w-full relative h-fit overflow-auto">
          <CommandList>
            {searchInput !== "" && open && (
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
export default SearchInput;
