"use client";

import { useEffect } from "react";

import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import {
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

import AccessibilityPin from "./MetroA11yWrapper";
import RouteLine from "./RouteWrapper";
import SearchInput from "./SearchInput";
import GotoNowButton from "./shared/GotoNowButton";
import NowPin from "./shared/NowPin";
import SearchPin from "./shared/SearchPin";

export default function ClientMap() {
  const {
    setMap,

    setUserLocation,
    destination,
    searchPlace,
    setSearchPlace,
  } = useMapStore();

  const mapHook = useMap();
  const placesLib = useMapsLibrary("places");
  const taipeiNewTaipeiBounds = {
    north: 25.3, // 北到淡水、金山一帶
    south: 24.8, // 南到鶯歌、新店深山
    east: 121.8, // 東到瑞芳、貢寮
    west: 121.25, // 西到林口、八里
  };

  useEffect(() => {
    if (!mapHook) return;
    setMap(mapHook);
  }, [mapHook, setMap]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (!mapHook) return;
      mapHook.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, [mapHook, setUserLocation]);

  return (
    <GoogleMap
      defaultZoom={15}
      reuseMaps
      colorScheme="FOLLOW_SYSTEM"
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
        await place.fetchFields({ fields: ["*"] });

        const latLng = getLocation(place);
        if (!latLng) return;
        setSearchPlace({ kind: "place", place, position: latLng });
      }}
      mapId={"9b39d2c1e16cb61adfef5521"}
      defaultBounds={taipeiNewTaipeiBounds}
      className=" w-dvw h-dvh bg-background   "
    >
      <AccessibilityPin />
      <SearchInput />
      <GotoNowButton />
      <RouteLine />
      <NowPin />
      {destination && <SearchPin destination={destination} />}
      {searchPlace && <SearchPin destination={searchPlace} />}
    </GoogleMap>
  );
}
