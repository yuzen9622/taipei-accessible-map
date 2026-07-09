import {
  Bike,
  BusIcon,
  Car,
  Clock,
  Footprints,
  ShieldCheck,
  TrainFrontIcon,
  TrainFrontTunnelIcon,
  TramFront,
} from "lucide-react";
import maplibregl from "maplibre-gl";
import { memo, useMemo } from "react";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import type { AccessibleRoute, RouteLeg } from "@/types/route";
import {
  formatDistance,
  formatDuration,
  formatWaitInfo,
  getA11yLabelColor,
  getA11yLabelText,
  getLegColor,
  scoreToLabel,
} from "@/types/route";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type RouteCardProps = {
  route: AccessibleRoute;
  idx: number;
};

function LegIcon({ leg }: { leg: RouteLeg }) {
  const color = getLegColor(leg);
  switch (leg.type) {
    case "WALK":
      return <Footprints className="h-4 w-4" style={{ color }} />;
    case "BUS":
      return <BusIcon className="h-4 w-4" style={{ color }} />;
    case "METRO":
      return <TramFront className="h-4 w-4" style={{ color }} />;
    case "THSR":
      return <TrainFrontTunnelIcon className="h-4 w-4" style={{ color }} />;
    case "TRA":
      return <TrainFrontIcon className="h-4 w-4" style={{ color }} />;
    case "DRIVE":
      return <Car className="h-4 w-4" style={{ color }} />;
    case "MOTORCYCLE":
      return <Bike className="h-4 w-4" style={{ color }} />;
  }
}

function WaitBadge({ leg }: { leg: Extract<RouteLeg, { waitInfo: unknown }> }) {
  const text = formatWaitInfo(leg.waitInfo);
  if (!text) return null;
  return <span className="text-xs text-muted-foreground">等候 {text}</span>;
}

function LegDetail({ leg }: { leg: RouteLeg }) {
  switch (leg.type) {
    case "WALK":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium">
            步行 {formatDistance(leg.distanceM)}
          </p>
          <p className="text-xs text-muted-foreground">
            約 {formatDuration(leg.minutesEst)}
          </p>
          {leg.exitInfo && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              🛗 {leg.exitInfo.exitName} (
              {leg.exitInfo.type === "elevator" ? "電梯" : "斜坡"})
            </p>
          )}
          {!!leg.a11yFacilities?.length && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              ♿ 沿途 {leg.a11yFacilities.length} 個無障礙設施
            </p>
          )}
        </div>
      );
    case "BUS":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="px-2 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: getLegColor(leg) }}
            >
              {leg.routeName}
            </div>
            <WaitBadge leg={leg} />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">上車：</span>
              <span className="font-medium">{leg.departureStop}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">下車：</span>
              <span className="font-medium">{leg.arrivalStop}</span>
            </div>
          </div>
          {leg.nearestBus && (
            <p className="text-xs text-green-600 dark:text-green-400">
              🚌 最近公車{" "}
              {leg.nearestBus.stopsAway != null
                ? `${leg.nearestBus.stopsAway} 站`
                : "接近中"}
            </p>
          )}
        </div>
      );
    case "METRO":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="px-2 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: getLegColor(leg) }}
            >
              {leg.lineName}
            </div>
            <WaitBadge leg={leg} />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">上車：</span>
              <span className="font-medium">{leg.departureStation}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">下車：</span>
              <span className="font-medium">{leg.arrivalStation}</span>
            </div>
            <div className="text-muted-foreground">
              {leg.stopsCount} 站 · 約 {formatDuration(leg.rideMinutes)}
            </div>
          </div>
          {!!leg.facilityHighlights?.length && (
            <div className="space-y-0.5">
              {leg.facilityHighlights?.map((h) => (
                <p key={h} className="text-xs text-blue-600 dark:text-blue-400">
                  🛗 {h}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    case "THSR":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="px-2 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: getLegColor(leg) }}
            >
              高鐵 {leg.trainNo}
            </div>
            <WaitBadge leg={leg} />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">上車：</span>
              <span className="font-medium">{leg.departureStation}</span>
              {leg.departureTime && (
                <span className="text-muted-foreground">
                  {leg.departureTime}
                </span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">下車：</span>
              <span className="font-medium">{leg.arrivalStation}</span>
              {leg.arrivalTime && (
                <span className="text-muted-foreground">{leg.arrivalTime}</span>
              )}
            </div>
            <div className="text-muted-foreground">
              約 {formatDuration(leg.rideMinutes)}
            </div>
          </div>
          {!!leg.facilityHighlights?.length && (
            <div className="space-y-0.5">
              {leg.facilityHighlights?.map((h) => (
                <p key={h} className="text-xs text-blue-600 dark:text-blue-400">
                  ♿ {h}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    case "TRA":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="px-2 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: getLegColor(leg) }}
            >
              {leg.trainTypeName} {leg.trainNo}
            </div>
            <WaitBadge leg={leg} />
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">上車：</span>
              <span className="font-medium">{leg.departureStation}</span>
              {leg.departureTime && (
                <span className="text-muted-foreground">
                  {leg.departureTime}
                </span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">下車：</span>
              <span className="font-medium">{leg.arrivalStation}</span>
              {leg.arrivalTime && (
                <span className="text-muted-foreground">{leg.arrivalTime}</span>
              )}
            </div>
            <div className="text-muted-foreground">
              約 {formatDuration(leg.rideMinutes)}
            </div>
          </div>
          {!!leg.facilityHighlights?.length && (
            <div className="space-y-0.5">
              {leg.facilityHighlights?.map((h) => (
                <p key={h} className="text-xs text-blue-600 dark:text-blue-400">
                  ♿ {h}
                </p>
              ))}
            </div>
          )}
        </div>
      );
    case "DRIVE":
    case "MOTORCYCLE":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {leg.label ?? (leg.type === "DRIVE" ? "開車" : "機車")}{" "}
            {formatDistance(leg.distanceM)}
          </p>
          <p className="text-xs text-muted-foreground">
            約 {formatDuration(leg.durationMinutes)}
          </p>
          <p className="text-xs text-muted-foreground">
            {[leg.from, leg.to].filter(Boolean).join(" → ")}
          </p>
        </div>
      );
  }
}

export const RouteCard = memo(function RouteCard({
  route,
  idx,
}: RouteCardProps) {
  const { setRouteSelect, selectRoute, map } = useMapStore();
  const { t } = useAppTranslation();
  const { userConfig } = useAuthStore();
  const isSelected = selectRoute?.index === idx;

  const label =
    route.accessibilityLabel ??
    (route.accessibilityScore != null
      ? scoreToLabel(route.accessibilityScore)
      : null);

  const legStepColor = (leg: RouteLeg) => {
    if (leg.type === "WALK") {
      return "border-blue-500 bg-blue-50 dark:bg-blue-950/20";
    }
    return "border-gray-300 bg-gray-50 dark:bg-gray-950/20";
  };

  const routeSummary = useMemo(() => {
    const types = route.legs
      .filter((l) => l.type !== "WALK")
      .map((l) => {
        switch (l.type) {
          case "BUS":
            return l.routeName;
          case "METRO":
            return l.lineName;
          case "THSR":
            return `高鐵${l.trainNo}`;
          case "TRA":
            return `${l.trainTypeName}${l.trainNo}`;
          case "DRIVE":
          case "MOTORCYCLE":
            return l.label ?? (l.type === "DRIVE" ? "開車" : "機車");
        }
        return "";
      });
    return types.join(" → ");
  }, [route.legs]);

  const handleSelect = () => {
    setRouteSelect({ index: idx, route });

    if (map) {
      const bounds = new maplibregl.LngLatBounds();
      for (const leg of route.legs) {
        if (leg.polyline?.length) {
          for (const [lng, lat] of leg.polyline) {
            bounds.extend([lng, lat]);
          }
        }
      }
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 200, left: 50, right: 50 },
      });
    }
  };

  return (
    <Card className={cn(isSelected && "ring-2 ring-primary")}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{route.routeName}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-bold text-sm">
              {formatDuration(route.totalMinutes)}
            </span>
          </div>
        </CardTitle>

        {routeSummary && (
          <p className="text-xs text-muted-foreground">{routeSummary}</p>
        )}

        <div className="flex items-center gap-2">
          {label && (
            <Badge
              className="gap-1"
              style={{
                backgroundColor: getA11yLabelColor(label),
                color: "#fff",
              }}
            >
              <ShieldCheck className="h-3 w-3" />
              {getA11yLabelText(label, userConfig.language)}{" "}
              {route.accessibilityScore}
            </Badge>
          )}
          {route.transferCount > 0 && (
            <Badge variant="outline" className="text-xs">
              轉乘 {route.transferCount} 次
            </Badge>
          )}
          {isSelected && <Badge>{t("selectedRoute")}</Badge>}
        </div>

        {isSelected && route.scoreComponents && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(
              ["facilityScore", "timeScore", "criticalFeatureScore"] as const
            ).map((key) => {
              const val = route.scoreComponents?.[key];
              return (
                <div
                  key={key}
                  className="text-center p-2 rounded-lg bg-muted/40"
                >
                  <p className="text-lg font-bold">{val}</p>
                  <p className="text-xs text-muted-foreground">
                    {key === "facilityScore"
                      ? (t("facilityScore") ?? "設施")
                      : key === "timeScore"
                        ? (t("timeScore") ?? "時間")
                        : (t("criticalScore") ?? "關鍵")}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {isSelected && route.accessibilityHighlights?.length > 0 && (
          <div className="space-y-1">
            {route.accessibilityHighlights.map((h) => (
              <p
                key={h}
                className="text-sm bg-secondary rounded-2xl px-3 py-2 text-muted-foreground"
              >
                {h}
              </p>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="relative space-y-2">
          {route.legs.map((leg, index) => (
            <div key={`${leg.type}-${index}`} className="relative pl-8">
              {index !== route.legs.length - 1 && (
                <div
                  className={cn(
                    "absolute left-3.5 top-11 bottom-0 w-0.5",
                    leg.type === "WALK" ? "bg-blue-300" : "bg-orange-300",
                  )}
                />
              )}

              <div className="absolute left-0 top-1">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2",
                    legStepColor(leg),
                  )}
                >
                  <LegIcon leg={leg} />
                </div>
              </div>

              <div className="pb-4 ml-4">
                <LegDetail leg={leg} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            aria-label="Select route"
            onClick={handleSelect}
            disabled={isSelected}
            variant={isSelected ? "secondary" : "default"}
          >
            {isSelected ? t("selectedRoute") : t("selectRoute")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
RouteCard.displayName = "RouteCard";
