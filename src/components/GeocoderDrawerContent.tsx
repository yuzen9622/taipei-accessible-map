"use client";
import { MapPin, X } from "lucide-react";
import useMapStore from "@/stores/useMapStore";
import { Button } from "./ui/button";
import { DrawerHeader } from "./ui/drawer";

export default function GeocoderDrawerContent({
  geocoder,
}: {
  geocoder: google.maps.GeocoderResult;
}) {
  const { setInfoShow } = useMapStore();
  return (
    <DrawerHeader>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />

          <h1 className="text-xl font-bold  line-clamp-2">
            {geocoder.formatted_address}
          </h1>
        </div>
        <Button
          onClick={() => setInfoShow({ isOpen: false })}
          size="icon"
          variant="ghost"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    </DrawerHeader>
  );
}
