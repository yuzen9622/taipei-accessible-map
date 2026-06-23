"use client";
import { MapPin } from "lucide-react";

import { DrawerHeader } from "./ui/drawer";

export default function GeocoderDrawerContent({
  address,
}: {
  address: string;
}) {
  return (
    <DrawerHeader>
      <div className="flex items-center gap-2">
        <MapPin className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold w-10/12 line-clamp-2">{address}</h1>
      </div>
    </DrawerHeader>
  );
}
