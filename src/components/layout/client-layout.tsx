"use client";
import { useEffect } from "react";
import Header from "@/components/Header";
import useMapStore from "@/stores/useMapStore";
import AccessibleDrawer from "../AccessibleDrawer";

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
      <Header />
      <AccessibleDrawer />
      {children}
    </div>
  );
}
