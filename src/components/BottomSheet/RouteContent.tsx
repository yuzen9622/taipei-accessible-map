"use client";

import { ArrowLeft, Navigation } from "lucide-react";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import { RouteCard } from "../shared/RouteCard";
import LoadingDrawer from "../shared/LoadingDrawer";
import { Button } from "../ui/button";

export default function RouteContent() {
  const { t } = useAppTranslation();
  const {
    computeRoutes,
    closeRouteDrawer,
    setSheetMode,
    selectRoute,
    setIsNavigating,
  } = useMapStore();

  const handleBack = () => {
    closeRouteDrawer();
    setSheetMode("home");
  };

  const handleStartNav = () => {
    setIsNavigating(true);
  };

  if (!computeRoutes) {
    return <LoadingDrawer />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold">{t("route")}</h1>
      </div>

      {/* Start Navigation Button */}
      {selectRoute && (
        <Button
          onClick={handleStartNav}
          className="w-full rounded-xl h-12 text-base gap-2"
        >
          <Navigation className="h-5 w-5" />
          {t("startNav")}
        </Button>
      )}

      {/* Route Cards */}
      <div className="space-y-3">
        {computeRoutes.map((route, index) => (
          <RouteCard key={route.routeId} idx={index} route={route} />
        ))}
      </div>
    </div>
  );
}
