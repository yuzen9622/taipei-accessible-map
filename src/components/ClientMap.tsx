"use client";

import Map, { NavigationControl } from "react-map-gl/maplibre";
import { useTheme } from "next-themes";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import type maplibregl from "maplibre-gl";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import NowPin from "@/components/shared/NowPin";
import MapWrapper from "@/components/Wrapper/MapWrapper";
import AccessibilityPin from "@/components/Wrapper/MetroA11yWrapper";
import RouteLine from "@/components/Wrapper/RouteWrapper";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import AIChatBot from "./AIChatBot";
import GotoNowButton from "./shared/GotoNowButton";
import SearchPin from "./shared/SearchPin";
import TransitWrapper from "./Wrapper/TransitWrapper";

const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark_matter",
};

export default function ClientMap() {
  const {
    setMap,
    setInfoShow,
    setUserLocation,
    setSearchPlace,
    searchPlace,
    destination,
  } = useMapStore();
  const { theme } = useTheme();
  const { i18n } = useAppTranslation();

  const mapStyle =
    theme === "dark" ? MAP_STYLES.dark : MAP_STYLES.light;

  const handleLoad = useCallback(
    (evt: { target: maplibregl.Map }) => {
      setMap(evt.target);
    },
    [setMap]
  );

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

  const handleClick = useCallback(
    async (e: MapLayerMouseEvent) => {
      const { lngLat } = e;
      const lat = lngLat.lat;
      const lng = lngLat.lng;
      const lang = i18n.language === "zh-TW" ? "zh-TW" : "en";

      setInfoShow({ isOpen: true, kind: null });

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${lang}`
        );
        const data = await res.json();

        if (data && data.place_id) {
          const position = { lat, lng };
          setInfoShow({
            isOpen: true,
            place: data,
            kind: "place",
          });
          setSearchPlace({
            kind: "place",
            place: data,
            position,
          });
        } else {
          setInfoShow({
            isOpen: true,
            address: data.display_name || `${lat}, ${lng}`,
            kind: "coordinate",
          });
          setSearchPlace({
            kind: "coordinate",
            address: data.display_name || `${lat}, ${lng}`,
            position: { lat, lng },
          });
        }
      } catch {
        setInfoShow({
          isOpen: true,
          address: `${lat}, ${lng}`,
          kind: "coordinate",
        });
        setSearchPlace({
          kind: "coordinate",
          address: `${lat}, ${lng}`,
          position: { lat, lng },
        });
      }
    },
    [i18n.language, setInfoShow, setSearchPlace]
  );

  return (
    <Map
      key={i18n.language}
      initialViewState={{
        longitude: 121.55,
        latitude: 25.03,
        zoom: 15,
      }}
      mapStyle={mapStyle}
      onClick={handleClick}
      onLoad={handleLoad}
      style={{ position: "relative", flex: 1, overflow: "hidden" }}
    >
      <NavigationControl position="bottom-right" />
      <MapWrapper />
      <AccessibilityPin />
      <GotoNowButton />
      <NowPin />
      {searchPlace ? (
        <SearchPin destination={searchPlace} />
      ) : destination ? (
        <SearchPin destination={destination} />
      ) : null}
      <TransitWrapper />
      <AIChatBot />
      <RouteLine />
    </Map>
  );
}
