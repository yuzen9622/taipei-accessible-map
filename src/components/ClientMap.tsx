"use client";

import { useEffect, useMemo } from "react";

import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import {
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

import AccessibilityPin from "./MetroA11yWrapper";
import GotoNowButton from "./shared/GotoNowButton";
import NowPin from "./shared/NowPin";
import SearchPin from "./shared/SearchPin";

export default function ClientMap() {
  const {
    setMap,
    userLocation,
    setUserLocation,
    destination,
    searchPlace,
    setSearchPlace,
  } = useMapStore();

  const mapHook = useMap();
  const placesLib = useMapsLibrary("places");
  const bounds = useMemo(() => {
    if (!userLocation) return;
    return {
      north: userLocation.lat + 0.01,
      south: userLocation.lat - 0.01,
      east: userLocation.lng + 0.01,
      west: userLocation.lng - 0.01,
    };
  }, [userLocation]);

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
      defaultCenter={userLocation ?? { lat: 25.03, lng: 121.55 }}
      gestureHandling={"auto"}
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
      defaultBounds={bounds}
      className=" w-dvw h-dvh bg-background  "
    >
      <AccessibilityPin />

      <GotoNowButton />
      <NowPin />
      {destination && <SearchPin destination={destination} />}
      {searchPlace && <SearchPin destination={searchPlace} />}
    </GoogleMap>
  );
}
