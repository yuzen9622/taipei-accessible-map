"use client";

import { Navigation } from "lucide-react";
import usePin from "@/hook/usePin";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import { Button } from "../ui/button";

export default function GotoNowButton() {
  const { handlePinClick } = usePin();
  const { userLocation, sidebarCollapsed, activeRailPanel, is3D, setIs3D } =
    useMapStore();
  const panelOpen = activeRailPanel !== "none";

  return (
    <div
      className={cn(
        "absolute z-20 transition-all duration-300 flex flex-col gap-2",
        "bottom-32 right-3",
        "lg:bottom-5",
        // The icon rail stays visible when collapsed, so sit to its right.
        !sidebarCollapsed && panelOpen
          ? "lg:left-[468px] lg:right-auto"
          : "lg:left-[76px] lg:right-auto",
      )}
    >
      <Button
        aria-label={is3D ? "切換為 2D 視角" : "切換為 3D 視角"}
        aria-pressed={is3D}
        variant="secondary"
        size="icon"
        onClick={() => setIs3D(!is3D)}
        className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all text-xs font-bold"
      >
        {is3D ? "2D" : "3D"}
      </Button>
      <Button
        aria-label="回到目前位置"
        variant="secondary"
        size="icon"
        onClick={() => handlePinClick(userLocation)}
        className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all"
      >
        <Navigation className="h-5 w-5 text-foreground" />
      </Button>
    </div>
  );
}
