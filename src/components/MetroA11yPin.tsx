import { AccessibilityIcon, Icon } from "lucide-react";
import { useState } from "react";

import usePin from "@/hook/usePin";
import { A11yEnum } from "@/types/index";
import { arrowsUpDownSquare } from "@lucide/lab";
import { AdvancedMarker } from "@vis.gl/react-google-maps";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

import type { Marker } from "@/types";
export default function MetroA11yPin({ place }: { place: Marker }) {
  const [open, setOpen] = useState(false);
  const { handlePinClick } = usePin();

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
          {place.a11yType === A11yEnum.ELEVATOR ? (
            <Icon
              iconNode={arrowsUpDownSquare}
              size={18}
              className=" text-muted-foreground"
            />
          ) : (
            <AccessibilityIcon size={18} className=" text-muted-foreground" />
          )}
        </AdvancedMarker>
      </HoverCardTrigger>
      <HoverCardContent>
        <h1>{place.content?.title}</h1>
        <p className=" text-sm">{place.content?.desc}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
