import { MapPin } from "lucide-react";
import type { NominatimPlace } from "@/types";
import { DrawerHeader } from "./ui/drawer";

export default function PlaceDrawerContent({
  place,
}: {
  place: NominatimPlace;
}) {
  return (
    <DrawerHeader className="w-full flex flex-col gap-2 border-b border-border/50 py-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold line-clamp-2">
          {place.name || place.display_name}
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">{place.display_name}</p>
      {place.type && (
        <span className="inline-block w-fit px-2 py-1 rounded bg-primary/10 text-primary text-xs">
          {place.type}
        </span>
      )}
      {place.osm_id && (
        <a
          href={`https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline"
        >
          在 OpenStreetMap 查看
        </a>
      )}
    </DrawerHeader>
  );
}
