"use client";

import type maplibregl from "maplibre-gl";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import MapView, { NavigationControl } from "react-map-gl/maplibre";
import { toast } from "sonner";
import NowPin from "@/components/shared/NowPin";
import MapWrapper from "@/components/Wrapper/MapWrapper";
import AccessibilityPin from "@/components/Wrapper/MetroA11yWrapper";
import RoutePreviewHydrator from "@/components/Wrapper/RoutePreviewHydrator";
import RouteLine from "@/components/Wrapper/RouteWrapper";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";
import AIChatBot from "./AIChatBot";
import NavigationController from "./NavigationController";
import SearchPin from "./shared/SearchPin";
import AIResultWrapper from "./Wrapper/AIResultWrapper";
import HazardWrapper from "./Wrapper/HazardWrapper";
import LiveBusWrapper from "./Wrapper/LiveBusWrapper";
import MapControlsWrapper from "./Wrapper/MapControlsWrapper";
import SosTrackerWrapper from "./Wrapper/SosTrackerWrapper";
import TransitWrapper from "./Wrapper/TransitWrapper";

const MAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

// OpenMapTiles carries name:zh / name:en alongside the default bilingual
// "{name:latin}\n{name:nonlatin}" label — rewrite symbol layers so labels
// follow the UI language only.
function applyMapLanguage(map: maplibregl.Map, language: string) {
  const textField =
    language === "zh-TW"
      ? [
          "coalesce",
          ["get", "name:zh-Hant"],
          ["get", "name:zh"],
          ["get", "name"],
        ]
      : [
          "coalesce",
          ["get", "name:en"],
          ["get", "name:latin"],
          ["get", "name"],
        ];
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (layer.type !== "symbol") continue;
    const current = map.getLayoutProperty(layer.id, "text-field");
    if (!current) continue;
    // Only touch place-name labels; keep refs, house numbers, shields intact.
    const serialized = JSON.stringify(current);
    if (!serialized.includes("name")) continue;
    if (serialized === JSON.stringify(textField)) continue;
    map.setLayoutProperty(layer.id, "text-field", textField);
  }
}

export default function ClientMap() {
  const {
    map,
    setMap,
    setInfoShow,
    userLocation,
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

  // Shared-location links (?loc=lat,lng) start the camera on the shared point.
  // Falls back to the last-known GPS position cached in localStorage so the map
  // opens near the user instead of the hardcoded Taipei center.
  const [initialCenter] = useState<{ lat: number; lng: number } | null>(() => {
    if (typeof window === "undefined") return null;
    const loc = new URLSearchParams(window.location.search).get("loc");
    if (loc) {
      const [lat, lng] = loc.split(",").map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    try {
      const cached = localStorage.getItem("lastUserLocation");
      if (cached) {
        const { lat, lng } = JSON.parse(cached);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const mapStyle =
    resolvedTheme === "dark" ? MAP_STYLES.dark : MAP_STYLES.light;

  const pointerDownTime = useRef(0);
  const pointerDownPos = useRef<[number, number]>([0, 0]);

  const handleLoad = useCallback(
    (evt: { target: maplibregl.Map }) => {
      setMap(evt.target);
      applyMapLanguage(evt.target, i18n.language);
    },
    [setMap, i18n.language],
  );

  // Re-apply after theme swaps replace the style; the equality guard inside
  // applyMapLanguage keeps this from looping on its own styledata events.
  const handleStyleData = useCallback(
    (evt: { target: maplibregl.Map }) => {
      applyMapLanguage(evt.target, i18n.language);
    },
    [i18n.language],
  );

  useEffect(() => {
    const mock = new URLSearchParams(window.location.search).get("mockgeo");
    if (mock) {
      const [lat, lng] = mock.split(",").map(Number);
      const loc = { lat, lng };
      setUserLocation(loc);
      try {
        localStorage.setItem("lastUserLocation", JSON.stringify(loc));
      } catch {}
      const t = setInterval(() => setUserLocation(loc), 2000);
      return () => clearInterval(t);
    }

    const onPos = (pos: GeolocationPosition) => {
      const loc = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      setUserLocation(loc);
      try {
        localStorage.setItem("lastUserLocation", JSON.stringify(loc));
      } catch {}
      const h = pos.coords.heading;
      useNavStore
        .getState()
        .setGpsHeading(typeof h === "number" && !Number.isNaN(h) ? h : null);
    };

    // Fast coarse fix so the map centers on the user immediately, then
    // watchPosition upgrades to high-accuracy tracking.
    navigator.geolocation.getCurrentPosition(onPos, () => {}, {
      enableHighAccuracy: false,
      maximumAge: 60_000,
      timeout: 5_000,
    });

    const watchId = navigator.geolocation.watchPosition(
      onPos,
      () => {
        toast.error("無法取得目前位置");
      },
      { enableHighAccuracy: true, maximumAge: 1000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [setUserLocation]);

  // Cold-load with no share link: recenter the camera on the user's first GPS
  // fix instead of leaving it on the hardcoded Taipei fallback. Fires once so
  // it never fights subsequent manual panning.
  const hasAutoLocatedRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasSpecialParam =
      params.has("sessionId") || params.has("liff.state") || params.has("sos");
    if (hasSpecialParam) return;

    if (initialCenter) return;
    if (hasAutoLocatedRef.current) return;
    if (!map || !userLocation) return;
    hasAutoLocatedRef.current = true;
    map.flyTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 17,
      duration: 1000,
    });
  }, [map, userLocation, initialCenter]);

  // Shared-location links (?loc=lat,lng from the share dialog) land on the
  // shared point with the place panel open.
  useEffect(() => {
    const loc = new URLSearchParams(window.location.search).get("loc");
    if (!loc) return;
    const [lat, lng] = loc.split(",").map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const position = { lat, lng };
    const lang = i18n.language === "zh-TW" ? "zh-TW" : "en";
    setSheetMode("place");
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${lang}&zoom=18&addressdetails=1`,
    )
      .then((res) => res.json())
      .then((data) => {
        const address = data?.display_name ?? `${lat}, ${lng}`;
        setInfoShow({ isOpen: true, kind: "coordinate", address, position });
        setSearchPlace({ kind: "coordinate", address, position });
      })
      .catch(() => {
        setInfoShow({
          isOpen: true,
          kind: "coordinate",
          address: `${lat}, ${lng}`,
          position,
        });
        setSearchPlace({
          kind: "coordinate",
          address: `${lat}, ${lng}`,
          position,
        });
      });
  }, [i18n.language, setInfoShow, setSearchPlace, setSheetMode]);

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

        if (data?.place_id && data.name) {
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
        } else if (data?.place_id) {
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

  if (!mounted)
    return <div style={{ flex: 1, backgroundColor: "transparent" }} />;

  return (
    <MapView
      key={i18n.language}
      initialViewState={{
        longitude: initialCenter?.lng ?? 121.55,
        latitude: initialCenter?.lat ?? 25.03,
        zoom: initialCenter ? 17 : 15,
      }}
      mapStyle={mapStyle}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onLoad={handleLoad}
      onStyleData={handleStyleData}
      style={{ position: "relative", flex: 1, overflow: "hidden" }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <MapWrapper />
      <AccessibilityPin />
      <NowPin />
      <MapControlsWrapper />
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
      <SosTrackerWrapper />
      <RoutePreviewHydrator />
      <AIResultWrapper />
      {isNavigating && <NavigationController />}
    </MapView>
  );
}
