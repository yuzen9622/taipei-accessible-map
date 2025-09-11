"use client";

import {
  ArmchairIcon,
  CircleParkingIcon,
  DoorOpenIcon,
  Loader2Icon,
  ToiletIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import useComputeRoute from "@/hook/useComputeRoute";
import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

import { Button } from "./ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";

import type { Route } from "@/types/route.t";

const snap = ["500px", 1];
export default function InfoDrawer() {
  const { infoShow, setInfoShow, userLocation, setComputeRoute, map } =
    useMapStore();
  const { computeRoute } = useComputeRoute();

  const [direction, setDirection] = useState<
    "left" | "right" | "top" | "bottom"
  >("bottom");

  const [imgLoaded, setImgLoaded] = useState(false);
  const [snapTo, setSnapTo] = useState<string | number | null>(snap[0]);

  const placeImg = useMemo(() => {
    if (infoShow.kind !== "place" || !infoShow?.place?.photos) return null;
    setImgLoaded(false);
    return infoShow.place.photos[0].getURI({ maxWidth: 700, maxHeight: 500 });
  }, [infoShow]);

  useEffect(() => {
    const observer = new ResizeObserver((el) => {
      el.forEach((e) => {
        if (e.contentRect.width > 1024) {
          setDirection("left");
          setSnapTo(1);
        } else {
          setDirection("bottom");
          setSnapTo(snap[0]);
        }
      });
    });
    observer.observe(document.body);
    return () => {
      observer.disconnect();
    };
  }, []);

  const handlePlanRoute = useCallback(async () => {
    if (!infoShow.kind || infoShow.kind !== "place") return;
    const latLng = getLocation(infoShow.place);
    if (!latLng || !userLocation || !map) return;
    const result = await computeRoute(
      { lat: 25.0475613, lng: 121.5173399 },
      latLng
    );
    const [route] = result.routes as Route[];
    setComputeRoute(route);
    const { high, low } = route.viewport;
    const bounds: google.maps.LatLngBoundsLiteral = {
      north: high.latitude,
      south: low.latitude,
      east: high.longitude,
      west: low.longitude,
    };

    map.fitBounds(bounds);
  }, [computeRoute, infoShow, map, setComputeRoute, userLocation]);

  if (!infoShow.kind) return null;
  return (
    <Drawer
      key={direction}
      modal={false}
      open={infoShow.isOpen}
      direction={direction}
      snapPoints={direction === "bottom" ? snap : [2]}
      activeSnapPoint={snapTo}
      setActiveSnapPoint={setSnapTo}
      dismissible
      onOpenChange={(b) => setInfoShow({ ...infoShow, isOpen: b })}
    >
      {infoShow.kind === "place" && infoShow.place && (
        <DrawerContent className="  fixed p-2 flex gap-3 flex-col  items-center lg:items-start z-20  pointer-events-auto overflow-auto   select-text! text-center ">
          <DrawerHeader className=" w-full  flex flex-col   lg:items-start items-center gap-2 ">
            <div className=" w-full flex justify-end">
              <Button
                onClick={() => setInfoShow({ ...infoShow, isOpen: false })}
                className="w-fit"
                variant={"outline"}
              >
                <XIcon />
              </Button>
            </div>

            <DrawerTitle className=" text-3xl space-y-1  max-lg:max-w-10/12 ">
              {placeImg && (
                <div
                  className=" relative rounded-md object-cover w-full max-w-lg aspect-video  "
                  style={{
                    backgroundImage: `url("https://placehold.co/600x400?text=Loading...")`,
                    backgroundSize: "cover",
                  }}
                >
                  <Image
                    src={placeImg || ""}
                    alt={infoShow.place.displayName || ""}
                    width={700}
                    height={500}
                    priority
                    onLoad={() => {
                      setImgLoaded(true);
                    }}
                    loading="eager"
                    onError={(e) => {
                      const imgEl = e.target as HTMLImageElement;
                      imgEl.src = "https://placehold.co/600x400?text=圖片錯誤";
                      setImgLoaded(true);
                    }}
                    className=" object-cover w-full max-w-lg aspect-video  rounded-md"
                  />
                  {!imgLoaded && (
                    <div className=" rounded-sm  absolute inset-0 grid place-content-center  bg-background/90 backdrop-blur-3xl ">
                      <Loader2Icon className=" animate-spin" size={30} />
                    </div>
                  )}
                </div>
              )}
              {infoShow.place.displayName}
            </DrawerTitle>
            <DrawerDescription>
              <span className="text-muted-foreground text-sm ">
                {infoShow.place.formattedAddress}
              </span>
            </DrawerDescription>
            {infoShow.place.accessibilityOptions && (
              <DrawerDescription className=" flex gap-2 flex-wrap max-lg:justify-center">
                <span className="text-xs flex gap-2">
                  <DoorOpenIcon size={16} />
                  無障礙路口：
                  {infoShow.place.accessibilityOptions
                    .hasWheelchairAccessibleEntrance
                    ? "有"
                    : "無"}
                </span>
                <span className="text-xs flex gap-2">
                  <CircleParkingIcon size={16} />
                  無障礙停車位：
                  {infoShow.place.accessibilityOptions
                    .hasWheelchairAccessibleParking
                    ? "有"
                    : "無"}
                </span>
                <span className="text-xs flex gap-2">
                  <ToiletIcon size={16} />
                  無障礙衛生間：
                  {infoShow.place.accessibilityOptions
                    .hasWheelchairAccessibleRestroom
                    ? "有"
                    : "無"}
                </span>
                <span className="text-xs flex gap-2">
                  <ArmchairIcon size={16} />
                  無障礙座位：
                  {infoShow.place.accessibilityOptions
                    .hasWheelchairAccessibleSeating
                    ? "有"
                    : "無"}
                </span>
              </DrawerDescription>
            )}

            <div>
              <Button onClick={handlePlanRoute}>規劃路線</Button>
            </div>
          </DrawerHeader>
        </DrawerContent>
      )}
    </Drawer>
  );
}
