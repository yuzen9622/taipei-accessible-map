import { arrowsUpDownSquare } from "@lucide/lab";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { AccessibilityIcon, Icon, ToiletIcon } from "lucide-react";
import { useState } from "react";
import usePin from "@/hook/usePin";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { Marker } from "@/types";
import { A11yEnum } from "@/types/index";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
export default function MetroA11yPin({ place }: { place: Marker }) {
  const [open, setOpen] = useState(false);
  const { selectA11yPlace, setSelectA11yPlace, setA11yDrawerOpen } =
    useMapStore();
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
        <AdvancedMarker
          onClick={() => {
            handlePinClick(place.position);
            setSelectA11yPlace(place);
            setA11yDrawerOpen(true);
            setOpen(true);
          }}
          position={place.position}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className={cn(
            " bg-background  p-1 text-muted-foreground  ring-2 ring-ring rounded-full",
            selectA11yPlace?.id === place.id &&
              "ring-accent-foreground text-accent-foreground"
          )}
        >
          {A11yIcon()}
        </AdvancedMarker>
      </HoverCardTrigger>
      <HoverCardContent>
        <h1>{place.content?.title}</h1>
        <p className=" text-sm">{place.content?.desc}</p>
        <p>
          {place.position.lat}, {place.position.lng}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
