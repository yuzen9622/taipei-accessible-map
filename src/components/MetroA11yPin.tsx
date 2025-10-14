import { arrowsUpDownSquare } from "@lucide/lab";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { AccessibilityIcon, Icon, ToiletIcon } from "lucide-react";
import { useState } from "react";
import usePin from "@/hook/usePin";
import type { Marker } from "@/types";
import { A11yEnum } from "@/types/index";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
export default function MetroA11yPin({ place }: { place: Marker }) {
  const [open, setOpen] = useState(false);
  const { handlePinClick } = usePin();

  const A11yIcon = () => {
    if (place.a11yType === A11yEnum.ELEVATOR) {
      return (
        <Icon
          iconNode={arrowsUpDownSquare}
          size={18}
          className=" text-muted-foreground"
        />
      );
    } else if (place.a11yType === A11yEnum.RAMP) {
      return <AccessibilityIcon size={18} className=" text-muted-foreground" />;
    } else {
      return <ToiletIcon size={18} className=" text-muted-foreground" />;
    }
  };

  return (
    <HoverCard open={open} onOpenChange={setOpen} key={place.id}>
      <HoverCardTrigger asChild>
        <AdvancedMarker
          onClick={() => {
            handlePinClick(place.position);
            setOpen(true);
          }}
          position={place.position}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className=" bg-background  p-1  ring-2 ring-ring rounded-full"
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
