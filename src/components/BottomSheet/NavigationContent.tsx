"use client";

import { Footprints, Navigation, Square, TramFront } from "lucide-react";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import { formatDistance, formatDuration, getLegColor } from "@/types/route";
import { Button } from "../ui/button";

export default function NavigationContent() {
  const { t } = useAppTranslation();
  const { selectRoute, setIsNavigating } = useMapStore();

  const route = selectRoute?.route;
  const currentLeg = route?.legs[0];

  return (
    <div className="space-y-3">
      {/* Current Step */}
      {currentLeg && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: getLegColor(currentLeg) + "20" }}
          >
            {currentLeg.type === "WALK" ? (
              <Footprints className="h-5 w-5" style={{ color: getLegColor(currentLeg) }} />
            ) : (
              <TramFront className="h-5 w-5" style={{ color: getLegColor(currentLeg) }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {currentLeg.type === "WALK"
                ? `步行 ${formatDistance(currentLeg.distanceM)}`
                : currentLeg.type === "METRO"
                  ? currentLeg.lineName
                  : currentLeg.type === "BUS"
                    ? currentLeg.routeName
                    : route?.routeName}
            </p>
            <p className="text-xs text-muted-foreground">
              {route ? formatDuration(route.totalMinutes) : ""}
            </p>
          </div>
          <Navigation className="h-5 w-5 text-primary shrink-0" />
        </div>
      )}

      {/* End Navigation */}
      <Button
        onClick={() => setIsNavigating(false)}
        variant="destructive"
        className="w-full rounded-xl h-11 gap-2"
      >
        <Square className="h-4 w-4" />
        {t("endNav")}
      </Button>
    </div>
  );
}
