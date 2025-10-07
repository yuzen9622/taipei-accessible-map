"use client";
import { MapPin } from "lucide-react";

import { DrawerHeader } from "./ui/drawer";

export default function GeocoderDrawerContent({
  geocoder,
}: {
  geocoder: google.maps.GeocoderResult;
}) {
  return (
    <DrawerHeader>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />

          <h1 className="text-xl font-bold w-10/12  line-clamp-2">
            {geocoder.formatted_address}
          </h1>
        </div>
      </div>
    </DrawerHeader>
  );
}
