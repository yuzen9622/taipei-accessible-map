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
        className="rounded-full h-10 w-10 shadow-lg backdrop-blur-sm bg-background/80 border border-border/50 hover:bg-background hover:shadow-xl transition-all"
      >
        <Navigation className="h-4 w-4 text-primary" />
      </Button>
    </div>
  );
}
