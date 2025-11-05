"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useCallback, useEffect } from "react";
import AccessibleDrawer from "@/components/Drawer/AccessibleDrawer";
import RouteDrawer from "@/components/Drawer/RouteDrawer";
import { refreshToken } from "@/lib/api/auth";
import { getUserInfo } from "@/lib/api/user";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import NavigationDrawer from "../Drawer/NavigationDrawer";
import TestDrawer from "../Drawer/TestDrawer";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initSearchHistory, setSearchPlace, setInfoShow } = useMapStore();
  const { setSession, setUser, setUserConfig } = useAuthStore();
  const PlaceLib = useMapsLibrary("places");
  const getNewAccessToken = useCallback(async () => {
    const token = await refreshToken();
    if (token) {
      setSession({ accessToken: token });
      const { data } = await getUserInfo();
      if (data?.user) setUser(data.user);
      if (data?.config) {
        setUserConfig(data.config);
      }
    }
  }, [setSession, setUser, setUserConfig]);

  const initPlace = useCallback(async () => {
    if (!PlaceLib) return;
    const { Place } = PlaceLib;
    const place = new Place({
      id: "ChIJUZ-WfXKpQjQR0j4ggToD89A",
    });
    await place.fetchFields({ fields: ["*"] });
    setSearchPlace({
      kind: "place",
      place: place,
      position: place.location?.toJSON() || { lat: 0, lng: 0 },
    });
    setInfoShow({
      isOpen: true,
      kind: "place",
      place: place,
    });
  }, [setSearchPlace, setInfoShow, PlaceLib]);

  useEffect(() => {
    const storedHistory = localStorage.getItem("searchHistory");
    getNewAccessToken();
    if (storedHistory) {
      initSearchHistory(JSON.parse(storedHistory));
    }
    initPlace();
  }, [initSearchHistory, getNewAccessToken, initPlace]);

  return (
    <div className="w-full h-dvh flex flex-col">
      <TestDrawer />
      <RouteDrawer /> <AccessibleDrawer /> <NavigationDrawer />
      {children}
    </div>
  );
}
