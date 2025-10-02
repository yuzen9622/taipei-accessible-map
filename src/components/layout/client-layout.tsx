"use client";
import { useCallback, useEffect } from "react";
import { refreshToken } from "@/lib/api/auth";
import { getUserInfo } from "@/lib/api/user";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import AccessibleDrawer from "../AccessibleDrawer";
import InfoDrawer from "../InfoDrawer";
import RouteDrawer from "../RouteDrawer";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initSearchHistory } = useMapStore();
  const { setSession, setUser } = useAuthStore();

  const getNewAccessToken = useCallback(async () => {
    const token = await refreshToken();
    if (token) {
      setSession({ accessToken: token });
      const { data } = await getUserInfo();
      if (data?.user) setUser(data.user);
    }
  }, [setSession, setUser]);

  useEffect(() => {
    const storedHistory = localStorage.getItem("searchHistory");
    getNewAccessToken();
    if (storedHistory) {
      initSearchHistory(JSON.parse(storedHistory));
    }
  }, [initSearchHistory, getNewAccessToken]);

  return (
    <div className="w-full h-dvh flex flex-col">


      {children}
    </div>
  );
}
