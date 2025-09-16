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
import { cn, getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

import { BusinessHours } from "./BusinessHours";
import DrawerWrapper from "./DrawerWrapper";
import LoadingDrawer from "./shared/LoadingDrawer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";

export default function InfoDrawer() {
  const {
    infoShow,
    setInfoShow,
    userLocation,
    setRouteInfoShow,
    setComputeRoute,
    setDestination,
    map,
  } = useMapStore();
  const { computeRoute, isLoading } = useComputeRoute();
  const [isOpen, setIsOpen] = useState(false);

  const [imgLoaded, setImgLoaded] = useState(false);

  const placeImg = useMemo(() => {
    if (infoShow.kind !== "place" || !infoShow?.place?.photos) return null;

    return infoShow.place.photos[0].getURI({ maxWidth: 700, maxHeight: 500 });
  }, [infoShow]);

  const placeHours = useMemo(() => {
    if (infoShow.kind !== "place" || !infoShow?.place?.regularOpeningHours)
      return null;
    return infoShow?.place?.regularOpeningHours;
  }, [infoShow]);

  useEffect(() => {
    let cancelled = false;

    if (infoShow.kind !== "place" || !infoShow.place?.isOpen) {
      setIsOpen(false);

      return;
    }

    infoShow.place.isOpen().then((b: boolean | null | undefined) => {
      if (!cancelled) setIsOpen(Boolean(b));
    });

    return () => {
      cancelled = true;
    };
  }, [infoShow.kind, infoShow]);

  const handlePlanRoute = useCallback(async () => {
    if (!infoShow.kind || infoShow.kind !== "place") return;
    const latLng = getLocation(infoShow.place);
    if (!latLng || !userLocation || !map) return;
    await computeRoute({ lat: 25.0475613, lng: 121.5173399 }, latLng);

    setDestination({ kind: "place", place: infoShow.place, position: latLng });
    setInfoShow({ isOpen: false, kind: null });
    setRouteInfoShow(true);
  }, [
    setDestination,
    computeRoute,
    setInfoShow,
    setRouteInfoShow,
    infoShow,
    map,

    userLocation,
  ]);

  return (
    <DrawerWrapper
      open={infoShow.isOpen}
      snapPoints={["500px", 1]}
      onOpenChange={(b) => setInfoShow({ ...infoShow, isOpen: b })}
    >
      <DrawerContent
        tabIndex={void 0}
        className="  fixed p-2 flex gap-3 after:hidden flex-col  items-center lg:items-start z-20  pointer-events-auto overflow-auto   select-text! text-center "
      >
        {infoShow.kind === "place" && infoShow.place ? (
          <>
            <DrawerHeader className=" w-full  flex flex-col    lg:items-start items-center gap-3 ">
              <div className=" w-full flex justify-end">
                <Button
                  onClick={() => setInfoShow({ ...infoShow, isOpen: false })}
                  className="w-fit"
                  variant={"outline"}
                >
                  <XIcon />
                </Button>
              </div>
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
              <DrawerTitle className=" text-3xl space-y-1  max-lg:max-w-10/12 ">
                {infoShow.place.displayName}
              </DrawerTitle>
              <Badge
                className={cn(isOpen && "bg-green-500")}
                variant={isOpen ? "default" : "outline"}
              >
                {isOpen ? "營業中" : "休息中"}
              </Badge>

              {infoShow.place.accessibilityOptions && (
                <DrawerDescription className=" flex gap-2 flex-wrap max-lg:justify-center">
                  <span className="text-base flex gap-2 items-center">
                    <DoorOpenIcon size={16} />
                    無障礙路口：
                    {infoShow.place.accessibilityOptions
                      .hasWheelchairAccessibleEntrance
                      ? "有"
                      : "無"}
                  </span>
                  <span className="text-base flex gap-2 items-center ">
                    <CircleParkingIcon size={16} />
                    無障礙停車位：
                    {infoShow.place.accessibilityOptions
                      .hasWheelchairAccessibleParking
                      ? "有"
                      : "無"}
                  </span>
                  <span className="text-base  flex gap-2 items-center">
                    <ToiletIcon size={16} />
                    無障礙衛生間：
                    {infoShow.place.accessibilityOptions
                      .hasWheelchairAccessibleRestroom
                      ? "有"
                      : "無"}
                  </span>
                  <span className="text-base flex gap-2 items-center">
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
                <Button disabled={isLoading} onClick={handlePlanRoute}>
                  規劃路線
                  {isLoading && <Loader2Icon className="animate-spin" />}
                </Button>
              </div>
            </DrawerHeader>
            <div className="px-4">
              <span>{infoShow.place.formattedAddress}</span>
              <span>
                <Accordion collapsible type="single">
                  <AccordionItem value="hours">
                    <AccordionTrigger>
                      {isOpen ? "營業中" : "休息中"} - 營業時間
                    </AccordionTrigger>
                    <AccordionContent>
                      {placeHours && <BusinessHours hours={placeHours} />}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </span>
            </div>
          </>
        ) : (
          <LoadingDrawer />
        )}
      </DrawerContent>
    </DrawerWrapper>
  );
}
