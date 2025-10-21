"use client";

import { useCallback, useEffect } from "react";

import AccessibleDrawer from "@/components/AccessibleDrawer";
import RouteDrawer from "@/components/RouteDrawer";
import { refreshToken } from "@/lib/api/auth";
import { getUserInfo } from "@/lib/api/user";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import NavigationDrawer from "../NavigationDrawer";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initSearchHistory } = useMapStore();
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
    getNewAccessToken();
    if (storedHistory) {
      initSearchHistory(JSON.parse(storedHistory));
    }
  }, [initSearchHistory, getNewAccessToken]);

  return (
    <div className="w-full h-dvh flex flex-col">
      <RouteDrawer /> <AccessibleDrawer /> <NavigationDrawer />
      {children}
    </div>
  );
}
