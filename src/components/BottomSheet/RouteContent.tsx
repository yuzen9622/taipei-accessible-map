"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Cloud,
  Navigation,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";
import LoadingDrawer from "../shared/LoadingDrawer";
import { RouteCard } from "../shared/RouteCard";
import { Button } from "../ui/button";
import EnvironmentPanel from "./EnvironmentPanel";
import HazardReportPanel from "./HazardReportPanel";
import RouteExplanationPanel from "./RouteExplanationPanel";

type Panel = "none" | "explanation" | "environment" | "hazard";

export default function RouteContent() {
  const { t } = useAppTranslation();
  const {
    computeRoutes,
    setComputeRoutes,
    setRouteSelect,
    setRouteInfoShow,
    setSheetMode,
    selectRoute,
    setIsNavigating,
  } = useMapStore();

  const [panel, setPanel] = useState<Panel>("none");

  const handleBack = () => {
    setComputeRoutes(null);
    setRouteSelect(null);
    setRouteInfoShow(false);
    setSheetMode("plan");
  };

  const handleStartNav = async () => {
    // iOS 13+ requires DeviceOrientation permission to be requested from a user
    // gesture — this tap is that gesture. Elsewhere no prompt is needed.
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DOE?.requestPermission === "function") {
      try {
        const res = await DOE.requestPermission();
        useNavStore
          .getState()
          .setCompassPermission(res === "granted" ? "granted" : "denied");
      } catch {
        useNavStore.getState().setCompassPermission("denied");
      }
    } else {
      useNavStore.getState().setCompassPermission("granted");
    }
    setIsNavigating(true);
  };

  if (!computeRoutes) {
    return <LoadingDrawer />;
  }

  if (panel === "explanation") {
    return <RouteExplanationPanel onClose={() => setPanel("none")} />;
  }
  if (panel === "environment") {
    return <EnvironmentPanel onClose={() => setPanel("none")} />;
  }
  if (panel === "hazard") {
    return <HazardReportPanel onClose={() => setPanel("none")} />;
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
        <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Navigation className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-lg font-bold">{t("routeResultsTitle")}</h1>
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

      {/* Quick action chips */}
      {selectRoute && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setPanel("explanation")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("aiExplanation")}
          </button>
          <button
            type="button"
            onClick={() => setPanel("environment")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors whitespace-nowrap"
          >
            <Cloud className="h-3.5 w-3.5" />
            {t("environment")}
          </button>
          <button
            type="button"
            onClick={() => setPanel("hazard")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors whitespace-nowrap"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("reportHazard")}
          </button>
        </div>
      )}

      {/* Route Cards */}
      <div className="space-y-3">
        {computeRoutes.map((route, index) => (
          <RouteCard
            key={`${index}-${route.routeId ?? ""}`}
            idx={index}
            route={route}
          />
        ))}
      </div>
    </div>
  );
}
