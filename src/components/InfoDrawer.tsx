"use client";
import { ArmchairIcon, CircleParkingIcon, DoorOpenIcon, ToiletIcon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

import useMapStore from '@/stores/useMapStore';

import { Button } from './ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from './ui/drawer';

export default function InfoDrawer() {
  const { infoShow, setInfoShow } = useMapStore();
  const [direction, setDirection] = useState<
    "left" | "right" | "top" | "bottom"
  >("bottom");

  const placeImg = useMemo(() => {
    if (infoShow.kind !== "place" || !infoShow?.place?.photos) return null;

    return infoShow.place.photos[0].getURI({ maxWidth: 1000, maxHeight: 1000 });
  }, [infoShow]);

  useEffect(() => {
    const observer = new ResizeObserver((el) => {
      el.forEach((e) => {
        console.log(e);
        if (e.contentRect.width > 1024) {
          setDirection("left");
        } else {
          setDirection("bottom");
        }
      });
    });
    observer.observe(document.body);
    return () => {
      observer.disconnect();
    };
  }, []);

  if (!infoShow.kind) return null;
  return (
    <Drawer
      modal={false}
      open={infoShow.isOpen}
      dismissible
      direction={direction}
      onOpenChange={(b) => setInfoShow({ ...infoShow, isOpen: b })}
    >
      {infoShow.kind === "place" && infoShow.place && (
        <DrawerContent className="  fixed p-2 flex gap-3  flex-col  items-center lg:items-start z-0 pointer-events-auto   select-text! text-center ">
          <DrawerHeader className=" w-full  flex flex-col  lg:items-start items-center gap-2 ">
            <Image
              src={placeImg || ""}
              alt={infoShow.place.displayName || ""}
              width={500}
              height={500}
              className=" object-cover w-full max-w-lg aspect-video  rounded-md"
            />
            <DrawerTitle className=" text-3xl  max-lg:max-w-10/12 ">
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
              <Button>規劃路線</Button>
            </div>
          </DrawerHeader>
        </DrawerContent>
      )}
    </Drawer>
  );
}
