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
import NowPin from "@/components/shared/NowPin";
import MapWrapper from "@/components/Wrapper/MapWrapper";
import AccessibilityPin from "@/components/Wrapper/MetroA11yWrapper";
import RouteLine from "@/components/Wrapper/RouteWrapper";
import { useAppTranslation } from "@/i18n/client";
import { getLocation } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import AIChatBot from "./AIChatBot";
import GotoNowButton from "./shared/GotoNowButton";
import SearchPin from "./shared/SearchPin";
import TransitWrapper from "./Wrapper/TransitWrapper";
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

  const taipeiNewTaipeiBounds = {
    north: 25.3167,
    south: 24.8338,
    east: 122.0348,
    west: 120.3179,
  };

  useEffect(() => {
    if (!mapHook) return;
    setMap(mapHook);
  }, [mapHook, setMap]);

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
      <AIChatBot />
      <RouteLine />
    </GoogleMap>
  );
}
