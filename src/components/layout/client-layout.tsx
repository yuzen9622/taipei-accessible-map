"use client";

import { useCallback, useEffect } from "react";
import BottomSheet from "@/components/BottomSheet/BottomSheet";
import KeyboardShortcuts from "@/components/shared/KeyboardShortcuts";
import SkipNavLink from "@/components/shared/SkipNavLink";
import { refreshToken } from "@/lib/api/auth";
import { getUserInfo } from "@/lib/api/user";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initSearchHistory, initSavedPlaces, initSavedPlaceCategories } =
    useMapStore();
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
    const storedHistory = localStorage.getItem("searchHistory");
    const storedSaved = localStorage.getItem("savedPlaces");
    getNewAccessToken();
    if (storedHistory) {
      initSearchHistory(JSON.parse(storedHistory));
    }
    if (storedSaved) {
      initSavedPlaces(JSON.parse(storedSaved));
    }
    const storedCats = localStorage.getItem("savedPlaceCategories");
    if (storedCats) {
      try {
        initSavedPlaceCategories(JSON.parse(storedCats));
      } catch {
        // ignore corrupted category cache
      }
    }
  }, [
    initSearchHistory,
    initSavedPlaces,
    initSavedPlaceCategories,
    getNewAccessToken,
  ]);

  return (
    <div className="w-full h-dvh flex flex-col">
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
