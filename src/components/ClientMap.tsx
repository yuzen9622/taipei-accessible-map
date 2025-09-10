"use client";

import { useCallback, useEffect, useMemo } from "react";

import useMapStore from "@/stores/useMapStore";
import { Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";

import GotoNowButton from "./GotoNowButton";
import AccessibilityPin from "./MetroA11yWrapper";
import NowPin from "./NowPin";
import RoutePlanInput from "./RoutePlanInput";
import SearchPin from "./SearchPin";

import type { PlaceDetail } from "@/types";
export default function ClientMap() {
  const {
    map,
    setMap,
    userLocation,
    setUserLocation,
    setOrigin,
    setDestination,
    destination,
  } = useMapStore();

  const mapHook = useMap();

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

  const handleStartPlace = useCallback(
    (places: google.maps.places.Place) => {
      if (!map) return;

      if (!places.location) return;

      map.panBy(20, 20);
      const placeViewPort = places.location;

      const pos = {
        lat: placeViewPort.lat(),
        lng: placeViewPort.lng(),
      };
      setOrigin({ place: places, position: pos });
    },
    [map, setOrigin]
  );

  const handlePlace = useCallback(
    (places: google.maps.places.Place) => {
      if (!map) return;
      console.log(places.location);
      if (!places.location) return;

      map.panBy(20, 20);
      const placeViewPort = places.location;

      const pos = {
        lat: placeViewPort.lat(),
        lng: placeViewPort.lng(),
      };
      map.panTo(pos);
      map.setZoom(16);

      setDestination({ place: places, position: pos });
    },
    [map, setDestination]
  );

  return (
    <GoogleMap
      defaultZoom={15}
      reuseMaps
      colorScheme="FOLLOW_SYSTEM"
      defaultCenter={userLocation ?? { lat: 25.03, lng: 121.55 }}
      gestureHandling={"auto"}
      disableDefaultUI={true}
      mapId={"9b39d2c1e16cb61adfef5521"}
      defaultBounds={bounds}
      className=" w-dvw h-dvh bg-background"
    >
      {/* <SearchInput onPlaceSelect={handlePlace} /> */}
      <RoutePlanInput
        onOriginPlace={handleStartPlace}
        onDestinationPlace={handlePlace}
      />
      <AccessibilityPin />

      <GotoNowButton />
      <NowPin />

      {destination && <SearchPin />}
    </GoogleMap>
  );
}
