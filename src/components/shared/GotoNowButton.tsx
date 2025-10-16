"use clinets";
import { Crosshair } from "lucide-react";

import usePin from "@/hook/usePin";
import useMapStore from "@/stores/useMapStore";

import { Button } from "../ui/button";

export default function GotoNowButton() {
  const { handlePinClick } = usePin();
  const { userLocation } = useMapStore();
  if (!userLocation) return null;
  return (
    <div className=" absolute bottom-5 right-5">
      <Button
        variant={"secondary"}
        onClick={() => handlePinClick(userLocation)}
      >
        <Crosshair className=" text-muted-foreground/70" />
      </Button>
    </div>
  );
}
