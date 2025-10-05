"use client";

import { Heart, Share2 } from "lucide-react";

import { useCallback } from "react";

import useComputeRoute from "@/hook/useComputeRoute";
import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import { Button } from "./ui/button";
import { DrawerFooter } from "./ui/drawer";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import DrawerWrapper from "./DrawerWrapper";
import PlaceDrawerContent from "./PlaceDrawerContent";

export default function TestDrawer() {
  const {
    infoShow,
    setInfoShow,
    setSearchPlace,
    setRouteInfoShow,
    setDestination,

    map,
  } = useMapStore();
  const { isLoading, computeRouteService } = useComputeRoute();
  const handlePlanRoute = useCallback(async () => {
    if (infoShow.kind !== "place") return;
    const place = infoShow.place;
    const latLng = getLocation(place);
    if (!latLng || !map) return;
    console.log(place);
    await computeRouteService({ lat: 25.0475613, lng: 121.5173399 }, latLng);

    setDestination({ kind: "place", place, position: latLng });
    setSearchPlace(null);
    setInfoShow({ isOpen: false, kind: null });
    setRouteInfoShow(true);
  }, [
    infoShow,
    setDestination,
    computeRouteService,
    setInfoShow,
    setSearchPlace,
    setRouteInfoShow,
    map,
  ]);
  return (
    <DrawerWrapper open={infoShow.isOpen}>
      <div className="flex flex-col overflow-auto h-full">
        {infoShow.kind === "place" && (
          <PlaceDrawerContent place={infoShow.place} />
        )}
        <DrawerFooter className="bg-background/95 backdrop-blur-md border-t w-full border-border py-3 flex justify-end gap-2">
          <Button
            disabled={isLoading}
            onClick={handlePlanRoute}
            className="flex-1"
          >
            {isLoading ? "規劃中..." : "規劃路線"}
          </Button>
          <span className="space-x-4">
            <Button variant="outline" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </span>
        </DrawerFooter>
      </div>
    </DrawerWrapper>
  );
}
