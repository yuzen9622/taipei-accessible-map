"use client";
import { XIcon } from "lucide-react";

import useMapStore from "@/stores/useMapStore";

import DrawerWrapper from "./DrawerWrapper";

import RouteCard from "./shared/RouteCard";
import { Button } from "./ui/button";
import { DrawerHeader } from "./ui/drawer";

export default function RouteDrawer() {
  const {
    computeRoutes,
    routeInfoShow,
    setRouteInfoShow,
    setInfoShow,
    destination,
    setRouteSelect,
  } = useMapStore();

  if (!computeRoutes) return null;

  const handleBack = () => {
    setRouteInfoShow(false);
    setRouteSelect(null);
    if (destination && destination.kind === "place") {
      setInfoShow({ isOpen: true, place: destination.place, kind: "place" });
    }
  };

  return (
    <DrawerWrapper
      open={routeInfoShow}
      onOpenChange={(b) => setRouteInfoShow(b)}
    >
      <DrawerHeader className="w-full space-y-2 ">
        <div className=" flex gap-4  ml-10   justify-between  items-center">
          <h1 className="text-2xl">路線規劃</h1>
          <Button variant={"ghost"} onClick={handleBack}>
            <XIcon />
          </Button>
        </div>

        <section className=" space-y-2 ">
          {computeRoutes?.map((route) => (
            <RouteCard key={Math.random()} route={route} />
          ))}
        </section>
      </DrawerHeader>
    </DrawerWrapper>
  );
}
