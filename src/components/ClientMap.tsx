"use client";

import {
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

import { useEffect } from "react";
import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import AccessibleDrawer from "./AccessibleDrawer";
import InfoDrawer from "./InfoDrawer";
import MapWrapper from "./MapWrapper";
import AccessibilityPin from "./MetroA11yWrapper";
import RouteDrawer from "./RouteDrawer";
import RouteLine from "./RouteWrapper";
import TestDrawer from "./TestDrawer";
import VaulDrawer from "./ui/costum-drawer";

export default function ClientMap() {
  const { setMap, setInfoShow, setUserLocation, setSearchPlace } =
    useMapStore();

  const mapHook = useMap();
  const placesLib = useMapsLibrary("places");
  //定義台北新北市邊界
  const taipeiNewTaipeiBounds = {
    north: 25.3167, // 北到淡水、金山一帶
    south: 24.8338, // 南到鶯歌、新店深山
    east: 122.0348, // 東到瑞芳、貢寮
    west: 120.3179, // 西到林口、八里
  };

  //初始化map
  useEffect(() => {
    if (!mapHook) return;
    setMap(mapHook);
  }, [mapHook, setMap]);

  //取得當前位置
  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, [setUserLocation]);

  return (
    <GoogleMap
      defaultZoom={15}
      reuseMaps
      colorScheme="LIGHT"
      defaultCenter={{ lat: 25.03, lng: 121.55 }}
      gestureHandling={"auto"}
      restriction={{
        latLngBounds: taipeiNewTaipeiBounds,
        strictBounds: true,
      }}
      disableDefaultUI={true}
      onClick={async (e) => {
        e.stop();
        console.log(e.detail);
        if (!placesLib || !e.detail?.placeId) return;
        const place = new placesLib.Place({ id: e.detail.placeId });
        setInfoShow({ isOpen: true, kind: null });
        await place.fetchFields({ fields: ["*"] });

        const latLng = getLocation(place);
        if (!latLng) return;
        setInfoShow({ isOpen: true, place, kind: "place" });
        setSearchPlace({ kind: "place", place, position: latLng });
      }}
      mapId={"9b39d2c1e16cb61adfef5521"}
      defaultBounds={taipeiNewTaipeiBounds}
      className=" relative flex-1 bg-background overflow-hidden"
    >
      <MapWrapper />
      <AccessibilityPin />
      <AccessibleDrawer />

      <TestDrawer />
      <RouteDrawer />
      <RouteLine />
    </GoogleMap>
  );
}
