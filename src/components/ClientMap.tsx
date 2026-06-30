"use client";

import type maplibregl from "maplibre-gl";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import Map, { NavigationControl } from "react-map-gl/maplibre";
import { toast } from "sonner";
import NowPin from "@/components/shared/NowPin";
import MapWrapper from "@/components/Wrapper/MapWrapper";
import AccessibilityPin from "@/components/Wrapper/MetroA11yWrapper";
import RouteLine from "@/components/Wrapper/RouteWrapper";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";
import AIChatBot from "./AIChatBot";
import AirQualityWidget from "./AirQualityWidget";
import NavigationController from "./NavigationController";
import GotoNowButton from "./shared/GotoNowButton";
import SearchPin from "./shared/SearchPin";
import AIResultWrapper from "./Wrapper/AIResultWrapper";
import HazardWrapper from "./Wrapper/HazardWrapper";
import TransitWrapper from "./Wrapper/TransitWrapper";
import LiveBusWrapper from "./Wrapper/LiveBusWrapper";

const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

export default function ClientMap() {
  const {
    setMap,
    setInfoShow,
    setUserLocation,
    setSearchPlace,
    searchPlace,
    destination,
    setSheetMode,
    isNavigating,
  } = useMapStore();
  const { resolvedTheme } = useTheme();
  const { i18n } = useAppTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mapStyle = resolvedTheme === "dark" ? MAP_STYLES.dark : MAP_STYLES.light;

  const pointerDownTime = useRef(0);
  const pointerDownPos = useRef<[number, number]>([0, 0]);

  const handleLoad = useCallback(
    (evt: { target: maplibregl.Map }) => {
      setMap(evt.target);
    },
    [setMap],
  );

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        // Capture GPS course-over-ground as a heading fallback (null when
        // stationary). Pushed via getState() so this high-frequency value does
        // not re-render the whole map through useMapStore.
        const h = pos.coords.heading;
        useNavStore
          .getState()
          .setGpsHeading(typeof h === "number" && !Number.isNaN(h) ? h : null);
      },
      () => {
        toast.error("無法取得目前位置");
      },
      { enableHighAccuracy: true, maximumAge: 1000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [setUserLocation]);

  const handleMouseDown = useCallback((e: MapLayerMouseEvent) => {
    pointerDownTime.current = Date.now();
    pointerDownPos.current = [e.point.x, e.point.y];
  }, []);

  const handleClick = useCallback(
    async (e: MapLayerMouseEvent) => {
      if (isNavigating) return;
      const dt = Date.now() - pointerDownTime.current;
      const [sx, sy] = pointerDownPos.current;
      const dx = Math.abs(e.point.x - sx);
      const dy = Math.abs(e.point.y - sy);
      // Only trigger on deliberate taps: short press + minimal movement
      if (dt > 250 || dx > 4 || dy > 4) return;

      const { lngLat } = e;
      const lat = lngLat.lat;
      const lng = lngLat.lng;
      const lang = i18n.language === "zh-TW" ? "zh-TW" : "en";

      setInfoShow({ isOpen: true, kind: null });
      setSheetMode("place");

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${lang}&zoom=18&addressdetails=1`,
        );
        const data = await res.json();

        if (data && data.place_id && data.name) {
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
        } else if (data && data.place_id) {
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
          setInfoShow({ isOpen: false, kind: null });
        }
      } catch {
        setInfoShow({ isOpen: false, kind: null });
      }
    },
    [i18n.language, setInfoShow, setSearchPlace, setSheetMode, isNavigating],
  );

  if (!mounted) return <div style={{ flex: 1, backgroundColor: "transparent" }} />;

  return (
    <Map
      key={i18n.language}
      initialViewState={{
        longitude: 121.55,
        latitude: 25.03,
        zoom: 15,
      }}
      mapStyle={mapStyle}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onLoad={handleLoad}
      style={{ position: "relative", flex: 1, overflow: "hidden" }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <MapWrapper />
      <AirQualityWidget />
      <AccessibilityPin />
      <GotoNowButton />
      <NowPin />
      {searchPlace ? (
        <SearchPin destination={searchPlace} />
      ) : destination ? (
        <SearchPin destination={destination} />
      ) : null}
      <TransitWrapper />
      <LiveBusWrapper />
      <HazardWrapper />
      <AIChatBot />
      <RouteLine />
      <AIResultWrapper />
      {isNavigating && <NavigationController />}
    </Map>
  );
}
