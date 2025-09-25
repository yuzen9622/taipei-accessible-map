"use client";
import { useEffect } from "react";

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
  useEffect(() => {
    const storedHistory = localStorage.getItem("searchHistory");
    if (storedHistory) {
      initSearchHistory(JSON.parse(storedHistory));
    }
  }, [initSearchHistory]);
  return (
    <div className="w-full h-dvh flex flex-col">
      <AccessibleDrawer />
      <InfoDrawer />
      <RouteDrawer />
      {children}
    </div>
  );
}
