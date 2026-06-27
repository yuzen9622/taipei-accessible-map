"use client";

import { useCallback, useEffect } from "react";
import BottomSheet from "@/components/BottomSheet/BottomSheet";
import KeyboardShortcuts from "@/components/shared/KeyboardShortcuts";
import SkipNavLink from "@/components/shared/SkipNavLink";
import { refreshToken } from "@/lib/api/auth";
import { getUserInfo } from "@/lib/api/user";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import useStatusStore from "@/stores/useStatusStore";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initSearchHistory, initSavedPlaces, drawerPinned, sidebarCollapsed } = useMapStore();
  const { setSession, setUser, setUserConfig } = useAuthStore();
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

  useEffect(() => {
    useStatusStore.getState().startAction("load_preferences");
    const storedHistory = localStorage.getItem("searchHistory");
    const storedSaved = localStorage.getItem("savedPlaces");
    getNewAccessToken();
    if (storedHistory) {
      initSearchHistory(JSON.parse(storedHistory));
    }
    if (storedSaved) {
      initSavedPlaces(JSON.parse(storedSaved));
    }
    useStatusStore.getState().succeedAction("load_preferences");
  }, [initSearchHistory, initSavedPlaces, getNewAccessToken]);

  const showPinnedSidebar = drawerPinned && !sidebarCollapsed;

  return (
    <div
      className="w-full h-dvh flex flex-col"
      style={{
        paddingLeft: showPinnedSidebar ? 436 : 0,
        transition: "padding-left 0.3s ease",
      }}
    >
      <SkipNavLink />
      <main
        id="main-map"
        className="flex-1 relative"
        role="main"
        aria-label="Map"
      >
        {children}
      </main>
      <BottomSheet />
      <KeyboardShortcuts />
    </div>
  );
}
