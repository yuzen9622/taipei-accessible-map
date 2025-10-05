import React from "react";
import { DrawerHeader } from "./ui/drawer";

export default function GeocoderDrawerContent({
  geocoder,
}: {
  geocoder: google.maps.GeocoderResult;
}) {
  return <DrawerHeader> </DrawerHeader>;
}
