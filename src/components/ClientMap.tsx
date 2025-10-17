"use client";

import {
  type ColorScheme,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { toast } from "sonner";
import MapWrapper from "@/components/MapWrapper";
import AccessibilityPin from "@/components/MetroA11yWrapper";
import RouteLine from "@/components/RouteWrapper";
import NowPin from "@/components/shared/NowPin";
import { useAppTranslation } from "@/i18n/client";
import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import GotoNowButton from "./shared/GotoNowButton";
import SearchPin from "./shared/SearchPin";
import TransitWrapper from "./TransitWrapper";
export default function ClientMap() {
  const {
    setMap,
    setInfoShow,
    setUserLocation,
    setSearchPlace,
    searchPlace,
    navigation,
  } = useMapStore();
  const { theme } = useTheme();
  const { i18n } = useAppTranslation();
  const MAP_DARK_MODE: Record<string, ColorScheme> = {
    dark: "DARK",
    light: "LIGHT",
    system: "FOLLOW_SYSTEM",
  };

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
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        console.log("無法取得位置");
        toast.error("無法取得目前位置");
      },
      { enableHighAccuracy: true, maximumAge: Infinity }
    );
  }, [setUserLocation]);

  return (
    <GoogleMap
      key={i18n.language}
      defaultZoom={15}
      reuseMaps
      colorScheme={MAP_DARK_MODE[theme ?? "system"]}
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
      <GotoNowButton />
      <NowPin />
      {searchPlace && <SearchPin destination={searchPlace} />}
      <TransitWrapper />
      <RouteLine />
    </GoogleMap>
  );
}
