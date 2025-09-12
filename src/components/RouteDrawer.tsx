"use client";
import { ArrowLeft, TriangleAlertIcon } from "lucide-react";
import { useMemo } from "react";

import useMapStore from "@/stores/useMapStore";

import DrawerWrapper from "./DrawerWrapper";
import RoutePlanInput from "./PlanInput";
import { Button } from "./ui/button";
import { DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";

export default function RouteDrawer() {
  const {
    computeRoute,
    routeInfoShow,
    setRouteInfoShow,
    setInfoShow,
    destination,
  } = useMapStore();
  const routeLocalValue = useMemo(() => {
    const result = {
      distance: "",
      duration: "",
      desc: "",
    };
    if (!computeRoute) return result;
    if (computeRoute.localizedValues?.distance) {
      result.distance = computeRoute.localizedValues.distance.text;
    }

    if (computeRoute.localizedValues?.duration) {
      result.duration = computeRoute.localizedValues.duration.text;
    }

    result.desc = computeRoute.description || "";
    return result;
  }, [computeRoute]);

  if (!computeRoute) return null;

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
      <DrawerContent className="  fixed p-2 flex gap-3 after:hidden flex-col  items-center lg:items-start z-20  pointer-events-auto overflow-auto   select-text! text-center ">
        <DrawerHeader className="w-full">
          <div className=" flex gap-4  items-center">
            <Button variant={"ghost"} onClick={handleBack}>
              <ArrowLeft />
            </Button>

            <h1 className="text-2xl">路線規劃</h1>
          </div>
          <RoutePlanInput />
          <DrawerTitle className="text-2xl">
            {routeLocalValue?.distance}
          </DrawerTitle>
          <div>推薦路徑．{routeLocalValue?.duration}</div>

          {computeRoute.warnings && (
            <div className=" flex items-center gap-2  text-yellow-600 font-bold">
              <TriangleAlertIcon size={20} />
              {computeRoute.warnings?.join(",")}
            </div>
          )}
        </DrawerHeader>
      </DrawerContent>
    </DrawerWrapper>
  );
}
