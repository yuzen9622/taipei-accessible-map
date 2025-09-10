"use client";
import Image from "next/image";

import useMapStore from "@/stores/useMapStore";

import { Drawer, DrawerContent, DrawerTitle } from "./ui/drawer";

export default function InfoDrawer() {
  const { infoShow, setInfoShow } = useMapStore();
  console.log(infoShow.place);
  if (!infoShow.place) return null;
  return (
    <Drawer
      modal={false}
      open={infoShow.isOpen}
      onOpenChange={(b) => setInfoShow({ ...infoShow, isOpen: b })}
    >
      {infoShow.place && (
        <DrawerContent className="pointer-events-auto select-text! text-center ">
          <DrawerTitle className=" text-3xl ">
            {infoShow.place.displayName}
          </DrawerTitle>
          <span>{infoShow.place.formattedAddress}</span>
        </DrawerContent>
      )}
    </Drawer>
  );
}
