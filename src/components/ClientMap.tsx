"use client";

import {
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

import { useEffect } from "react";

import MapWrapper from "@/components/MapWrapper";
import AccessibilityPin from "@/components/MetroA11yWrapper";

import RouteLine from "@/components/RouteWrapper";
import NowPin from "@/components/shared/NowPin";

import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import SearchPin from "./shared/SearchPin";

export default function ClientMap() {
  const {
    setMap,
    setInfoShow,
    setUserLocation,
    setSearchPlace,
    searchPlace,
    navigation,
  } = useMapStore();

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
    navigator.geolocation.watchPosition(
      (pos) => {
        console.log(pos.coords);
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => console.log("無法取得位置"),
      { enableHighAccuracy: true, maximumAge: Infinity }
    );
  }, [setUserLocation]);

  return (
    <GoogleMap
      defaultZoom={15}
      reuseMaps
      colorScheme="LIGHT"
      defaultCenter={{ lat: 25.03, lng: 121.55 }}
      gestureHandling={"auto"}
      // restriction={{
      //   latLngBounds: taipeiNewTaipeiBounds,
      //   strictBounds: true,
      // }}
      disableDefaultUI={true}
      onClick={async (e) => {
        e.stop();

        console.log(e.detail);
        if (!placesLib || navigation.isNavigating || !mapHook) return;
        if (e.detail.placeId) {
          const place = new placesLib.Place({ id: e.detail.placeId });
          setInfoShow({ isOpen: true, kind: null });
          await place.fetchFields({ fields: ["*"] });
          const latLng = getLocation(place);
          if (!latLng) return;
          mapHook.panTo(latLng);
          mapHook.setZoom(18);
          setInfoShow({ isOpen: true, place, kind: "place" });
          setSearchPlace({ kind: "place", place, position: latLng });
        } else {
          const geocoder = new google.maps.Geocoder();
          const result = await geocoder.geocode({ location: e.detail.latLng });

          mapHook.panTo(result.results[0].geometry.location);
          mapHook.setZoom(18);
          console.log(result.results[0]);
          setInfoShow({
            isOpen: true,
            place: result.results[0],
            kind: "geocoder",
          });
          setSearchPlace({
            kind: "geocoder",
            place: result.results[0],
            position: result.results[0].geometry.location.toJSON(),
          });
        }
      }}
      mapId={"9b39d2c1e16cb61adfef5521"}
      defaultBounds={taipeiNewTaipeiBounds}
      className=" relative flex-1 bg-background overflow-hidden"
    >
      <MapWrapper />
      <AccessibilityPin />

      <NowPin />
      {searchPlace && <SearchPin destination={searchPlace} />}

      <RouteLine />
    </GoogleMap>
  );
}
