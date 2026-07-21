import { arrowsUpDownSquare } from "@lucide/lab";
import { AccessibilityIcon, Icon, ToiletIcon } from "lucide-react";
import { useState } from "react";
import { Marker } from "react-map-gl/maplibre";
import { useShallow } from "zustand/react/shallow";
import usePin from "@/hook/usePin";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { Marker as MarkerType } from "@/types";
import { A11yEnum } from "@/types/index";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

export default function A11yFacilityPin({ place }: { place: MarkerType }) {
  const [open, setOpen] = useState(false);
  const {
    selectA11yPlace,
    setSelectA11yPlace,
    setA11yDrawerOpen,
    setSheetMode,
  } = useMapStore(
    useShallow((s) => ({
      selectA11yPlace: s.selectA11yPlace,
      setSelectA11yPlace: s.setSelectA11yPlace,
      setA11yDrawerOpen: s.setA11yDrawerOpen,
      setSheetMode: s.setSheetMode,
    })),
  );
  const { handlePinClick } = usePin();

  const A11yIcon = () => {
    if (place.a11yType === A11yEnum.ELEVATOR) {
      return <Icon iconNode={arrowsUpDownSquare} size={18} />;
    } else if (place.a11yType === A11yEnum.RAMP) {
      return <AccessibilityIcon size={18} />;
    } else {
      return <ToiletIcon size={18} />;
    }
  };

  return (
    <HoverCard open={open} onOpenChange={setOpen} key={place.id}>
      <HoverCardTrigger asChild>
        <div>
          <Marker
            longitude={place.position.lng}
            latitude={place.position.lat}
            anchor="center"
            onClick={() => {
              handlePinClick(place.position);
              setSelectA11yPlace(place);
              setA11yDrawerOpen(true);
              setSheetMode("station");
              setOpen(true);
            }}
          >
            <div
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
              className={cn(
                "bg-background p-1 text-muted-foreground ring-2 ring-ring rounded-full cursor-pointer",
                selectA11yPlace?.id === place.id &&
                  "ring-accent-foreground text-accent-foreground",
              )}
            >
              {A11yIcon()}
            </div>
          </Marker>
        </div>
      </HoverCardTrigger>
      <HoverCardContent>
        <h1>{place.content?.title}</h1>
        <p className="text-sm">{place.content?.desc}</p>
        <p>
          {place.position.lat}, {place.position.lng}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
