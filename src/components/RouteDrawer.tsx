"use client";
import { XIcon } from "lucide-react";

import useMapStore from "@/stores/useMapStore";

import DrawerWrapper from "./DrawerWrapper";

import { RouteCard } from "./shared/RouteCard";
import { Button } from "./ui/button";
import { DrawerHeader } from "./ui/drawer";

export default function RouteDrawer() {
  const {
    computeRoutes,
    routeInfoShow,

    closeRouteDrawer,
  } = useMapStore();

  if (!computeRoutes) return null;

  return (
    <DrawerWrapper open={routeInfoShow}>
      <DrawerHeader className="w-full space-y-2 flex-1  overflow-auto ">
        <div className=" flex gap-4  ml-10    justify-between  items-center">
          <h1 className="text-2xl">路線規劃</h1>
          <Button
            variant={"ghost"}
            className="     absolute  bg-muted  z-20 rounded-3xl  right-8 top-4"
            onClick={closeRouteDrawer}
          >
            <XIcon />
          </Button>
        </div>

        <section className=" space-y-2 ">
          {computeRoutes?.map((route, index) => (
            <RouteCard key={Math.random()} idx={index} route={route} />
          ))}
        </section>
      </DrawerHeader>
    </DrawerWrapper>
  );
}
