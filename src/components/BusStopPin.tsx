import { Bus } from "lucide-react";
import { useState } from "react";
import { Marker } from "react-map-gl/maplibre";
import { useShallow } from "zustand/react/shallow";
import usePin from "@/hook/usePin";
import type { RouteDetailStop } from "@/lib/api/transit";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { BusStopSearchResult } from "@/types/transit";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

function isRouteDetailStop(
  s: (BusStopSearchResult & { distance?: number }) | RouteDetailStop,
): s is RouteDetailStop {
  return "lat" in s && "lng" in s;
}

export default function BusStopPin({
  stop,
  isSelected,
}: {
  stop: (BusStopSearchResult & { distance?: number }) | RouteDetailStop;
  isSelected?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const {
    selectedBusStop,
    setSelectedBusStop,
    setSheetMode,
    setInfoShow,
    setSearchPlace,
  } = useMapStore(
    useShallow((s) => ({
      selectedBusStop: s.selectedBusStop,
      setSelectedBusStop: s.setSelectedBusStop,
      setSheetMode: s.setSheetMode,
      setInfoShow: s.setInfoShow,
      setSearchPlace: s.setSearchPlace,
    })),
  );
  const { handlePinClick } = usePin();

  const isRouteStop = isRouteDetailStop(stop);
  const lat = isRouteStop ? stop.lat : stop.coordinates[1];
  const lng = isRouteStop ? stop.lng : stop.coordinates[0];
  const name = isRouteStop ? stop.name : stop.stopName;
  const city = isRouteStop ? null : stop.city;
  const routes = isRouteStop ? [] : stop.routes;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const active =
    isSelected ||
    (isRouteStop
      ? (selectedBusStop as RouteDetailStop)?.seq === stop.seq &&
        (selectedBusStop as RouteDetailStop)?.name === stop.name
      : (selectedBusStop as BusStopSearchResult)?.stopUid === stop.stopUid);

  const id = isRouteStop
    ? `route-stop-${stop.seq}-${stop.name}`
    : `bus-stop-${stop.stopUid}`;

  const handleClick = () => {
    handlePinClick({ lat, lng });
    setSelectedBusStop(stop);
    const fullAddress = city ? `${name}, ${city}` : name;
    setInfoShow({
      isOpen: true,
      kind: "coordinate",
      address: fullAddress,
      position: { lat, lng },
    });
    setSearchPlace({
      kind: "coordinate",
      address: fullAddress,
      position: { lat, lng },
    });
    setSheetMode("place");
    setOpen(true);
  };

  return (
    <HoverCard open={open} onOpenChange={setOpen} key={id}>
      <HoverCardTrigger asChild>
        <div>
          <Marker
            longitude={lng}
            latitude={lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              handleClick();
            }}
          >
            <button
              type="button"
              aria-label={name || "公車站牌"}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className={cn(
                "bg-background p-1 text-muted-foreground ring-2 ring-ring rounded-full cursor-pointer",
                active && "ring-accent-foreground text-accent-foreground",
              )}
            >
              <Bus size={18} />
            </button>
          </Marker>
        </div>
      </HoverCardTrigger>
      <HoverCardContent>
        <h1>{name}</h1>
        {city && <p className="text-sm">{city}</p>}
        {routes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {routes.slice(0, 8).join(" · ")}
          </p>
        )}
        <p>
          {lat}, {lng}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
