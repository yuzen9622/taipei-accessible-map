"use client";

import { Navigation } from "lucide-react";
import usePin from "@/hook/usePin";
import useMapStore from "@/stores/useMapStore";
import { Button } from "../ui/button";

export default function GotoNowButton() {
  const { handlePinClick } = usePin();
  const { userLocation, sidebarCollapsed, activeRailPanel, drawerPinned } = useMapStore();

  const sidebarVisible = !sidebarCollapsed && activeRailPanel !== "none";
  const pinnedOffset = drawerPinned && sidebarVisible;

  return (
    <div
      className="absolute z-20 bottom-32 right-3 lg:bottom-5 lg:right-5"
      style={{
        transition: "right 0.3s ease",
      }}
    >
      <Button
        aria-label="回到目前位置"
        variant="secondary"
        size="icon"
        onClick={() => handlePinClick(userLocation)}
        className="rounded-xl h-11 w-11 shadow-md bg-background border border-border/40 hover:bg-muted transition-colors"
      >
        <Navigation className="h-5 w-5 text-foreground" />
      </Button>
    </div>
  );
}
