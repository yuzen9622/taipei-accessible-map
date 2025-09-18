"use client";
import { ArrowLeft } from "lucide-react";

import useMapStore from "@/stores/useMapStore";

import DrawerWrapper from "./DrawerWrapper";
import RoutePlanInput from "./PlanInput";
import RouteCard from "./shared/RouteCard";
import { Button } from "./ui/button";
import { DrawerContent, DrawerHeader } from "./ui/drawer";

export default function RouteDrawer() {
  const {
    computeRoutes,
    routeInfoShow,
    setRouteInfoShow,
    setInfoShow,
    destination,
  } = useMapStore();

  if (!computeRoutes) return null;

  const handleBack = () => {
    setRouteInfoShow(false);
    if (destination && destination.kind === "place") {
      setInfoShow({ isOpen: true, place: destination.place, kind: "place" });
    }
  };

  return (
    <DrawerWrapper
      open={routeInfoShow}
      snapPoints={[1]}
      onOpenChange={(b) => setRouteInfoShow(b)}
    >
      <DrawerContent
        tabIndex={void 0}
        className="  fixed p-2 flex gap-3 after:hidden flex-col  items-center lg:items-start z-20  pointer-events-auto overflow-auto   select-text! text-center "
      >
        <DrawerHeader className="w-full space-y-2">
          <div className=" flex gap-4  items-center">
            <Button variant={"ghost"} onClick={handleBack}>
              <ArrowLeft />
            </Button>

            <h1 className="text-2xl">路線規劃</h1>
          </div>
          <RoutePlanInput />
          <p>{computeRoutes.length} 條路線建議</p>

          <section className=" space-y-2 ">
            {computeRoutes?.map((route) => (
              <RouteCard key={Math.random()} route={route} />
            ))}
          </section>
        </DrawerHeader>
      </DrawerContent>
    </DrawerWrapper>
  );
}
