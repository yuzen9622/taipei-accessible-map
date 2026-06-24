"use client";

import { Navigation } from "lucide-react";
import usePin from "@/hook/usePin";
import useMapStore from "@/stores/useMapStore";
import { Button } from "../ui/button";

export default function GotoNowButton() {
  const { handlePinClick } = usePin();
  const { userLocation } = useMapStore();

  return (
    <div className="absolute bottom-32 lg:bottom-5 right-3 z-20">
      <Button
        aria-label="回到目前位置"
        variant="secondary"
        size="icon"
        onClick={() => handlePinClick(userLocation)}
        className="rounded-full h-12 w-12 shadow-xl backdrop-blur-sm bg-background border-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 hover:shadow-2xl transition-all"
      >
        <Navigation className="h-5 w-5 text-primary" />
      </Button>
    </div>
  );
}
