"use client";

import { useCallback, useEffect } from "react";
import BottomSheet from "@/components/BottomSheet/BottomSheet";
import { refreshToken } from "@/lib/api/auth";
import { getUserInfo } from "@/lib/api/user";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initSearchHistory, initSavedPlaces } = useMapStore();
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
  }, [initSearchHistory, initSavedPlaces, getNewAccessToken]);

  return (
    <div className="w-full h-dvh flex flex-col">
      {children}
      <BottomSheet />
    </div>
  );
}
