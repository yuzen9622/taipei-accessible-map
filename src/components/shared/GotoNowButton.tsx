"use clinets";
import { Crosshair } from "lucide-react";

import usePin from "@/hook/usePin";
import useMapStore from "@/stores/useMapStore";

import { Button } from "../ui/button";

export default function GotoNowButton() {
  const { handlePinClick } = usePin();
  const { userLocation } = useMapStore();

  return (
    <div className=" absolute bottom-5 right-5 z-20">
      <Button
        aria-label="Goto now button"
        variant={"secondary"}
        onClick={() => handlePinClick(userLocation)}
      >
        <Crosshair className=" text-muted-foreground/70" />
      </Button>
    </div>
  );
}
