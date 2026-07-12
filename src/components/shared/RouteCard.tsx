import {
  Bike,
  BusIcon,
  Car,
  Check,
  ChevronDown,
  Clock,
  Footprints,
  ShieldCheck,
  TrainFrontIcon,
  TrainFrontTunnelIcon,
  TramFront,
} from "lucide-react";
import { memo, useId, useMemo, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { fitRouteBounds, routeBoundsFromLegs } from "@/lib/mapCamera";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import type {
  AccessibleRoute,
  RouteLeg,
  IntermediateStop,
  WaitInfo,
} from "@/types/route";
import {
  formatDistance,
  formatDuration,
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

function IntermediateStops({
  stops,
  color,
}: {
  stops?: IntermediateStop[];
  color: string;
}) {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  if (!stops || stops.length === 0) return null;

  return (
    <div className="my-1.5 ml-2.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={listId}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 px-2 py-2.5 lg:py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none",
            isOpen && "rotate-180",
          )}
        />
        <span>{t("passStops", { count: stops.length })}</span>
      </button>

      <div
        id={listId}
        aria-hidden={!isOpen}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="pl-3.5 my-2 space-y-2 border-l border-muted-foreground/30 ml-3.5">
            {stops.map((stop, idx) => (
              <div
                key={`${stop.stationUid || stop.name}-${idx}`}
                className="flex items-center gap-2.5 text-xs text-muted-foreground relative"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0 border border-background"
                  style={{ backgroundColor: color }}
                />
                <span>{stop.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type PointLabelContext = {
  originPosition?: { lat: number; lng: number } | null;
  destinationPosition?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  originName?: string;
  destinationName?: string;
  originFallback: string;
  destinationFallback: string;
  myLocationFallback: string;
};

const getPointLabel = (
  point: unknown,
  ctx: PointLabelContext,
  isOriginFallback = false,
  isDestFallback = false,
): string => {
  if (!point) return "";
  if (typeof point === "string") return point;
  if (typeof point === "object" && point !== null) {
    const p = point as Record<string, unknown>;
    const label = p.name || p.address || p.label;
    if (typeof label === "string" && label.trim() !== "") return label;

    const lat = Number(p.lat ?? p.latitude);
    const lng = Number(p.lng ?? p.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (ctx.originPosition) {
        const dist = Math.hypot(
          ctx.originPosition.lat - lat,
          ctx.originPosition.lng - lng,
        );
        if (dist < 0.001) return ctx.originName || ctx.originFallback;
      } else if (ctx.userLocation) {
        const dist = Math.hypot(
          ctx.userLocation.lat - lat,
          ctx.userLocation.lng - lng,
        );
        if (dist < 0.001) return ctx.originName || ctx.myLocationFallback;
      }

      if (ctx.destinationPosition) {
        const dist = Math.hypot(
          ctx.destinationPosition.lat - lat,
          ctx.destinationPosition.lng - lng,
        );
        if (dist < 0.001) return ctx.destinationName || ctx.destinationFallback;
      }

      if (isOriginFallback && ctx.originName) return ctx.originName;
      if (isDestFallback && ctx.destinationName) return ctx.destinationName;

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }
  return String(point);
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

// "等候 23:08" read like a 23-hour wait — a schedule source carries a clock
// time (departure), a realtime source carries minutes to wait.
function WaitBadge({ waitInfo }: { waitInfo: WaitInfo | null | undefined }) {
  const { t } = useAppTranslation();
  if (!waitInfo || waitInfo.source === "unavailable") return null;

  let text: string | null = null;
  if (waitInfo.source === "schedule" && typeof waitInfo.time === "string") {
    text = t("departsAt", { time: waitInfo.time });
  } else if (typeof waitInfo.time === "number") {
    text = t("waitMinutes", { count: waitInfo.time });
  }
  if (!text) return null;
  return <span className="text-xs text-muted-foreground">{text}</span>;
}

function TransitStops({
  boardName,
  alightName,
  boardTime,
  alightTime,
  intermediateStops,
  color,
}: {
  boardName?: string;
  alightName?: string;
  boardTime?: string;
  alightTime?: string;
  intermediateStops?: IntermediateStop[];
  color: string;
}) {
  const { t } = useAppTranslation();
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground shrink-0">
          {t("board")}
          {t("labelColon")}
        </span>
        <span className="font-medium">{boardName}</span>
        {boardTime && <span className="text-muted-foreground">{boardTime}</span>}
      </div>
      <IntermediateStops stops={intermediateStops} color={color} />
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground shrink-0">
          {t("alight")}
          {t("labelColon")}
        </span>
        <span className="font-medium">{alightName}</span>
        {alightTime && (
          <span className="text-muted-foreground">{alightTime}</span>
        )}
      </div>
    </div>
  );
}

function FacilityHighlights({ items }: { items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-0.5">
      {items.map((h) => (
        <p key={h} className="text-xs text-blue-600 dark:text-blue-400">
          <span aria-hidden>♿</span> {h}
        </p>
      ))}
    </div>
  );
}

function LegDetail({
  leg,
  isFirst,
  isLast,
  pointCtx,
}: {
  leg: RouteLeg;
  isFirst: boolean;
  isLast: boolean;
  pointCtx: PointLabelContext;
}) {
  const { t } = useAppTranslation();
  switch (leg.type) {
    case "WALK":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {t("walk")} {formatDistance(leg.distanceM)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("approxTime", { time: formatDuration(leg.minutesEst) })}
          </p>
          {leg.exitInfo && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <span aria-hidden>🛗</span> {leg.exitInfo.exitName} (
              {leg.exitInfo.type === "elevator" ? t("elevator") : t("ramp")})
            </p>
          )}
          {!!leg.a11yFacilities?.length && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <span aria-hidden>♿</span>{" "}
              {t("a11yFacilitiesAlong", { count: leg.a11yFacilities.length })}
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
            <WaitBadge waitInfo={leg.waitInfo} />
          </div>
          <TransitStops
            boardName={leg.departureStop}
            alightName={leg.arrivalStop}
            intermediateStops={leg.intermediateStops}
            color={getLegColor(leg)}
          />
          {leg.nearestBus && (
            <p className="text-xs text-green-600 dark:text-green-400">
              <span aria-hidden>🚌</span>{" "}
              {leg.nearestBus.stopsAway != null
                ? t("nearestBusStopsAway", { count: leg.nearestBus.stopsAway })
                : t("nearestBusApproaching")}
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
            <WaitBadge waitInfo={leg.waitInfo} />
          </div>
          <div className="space-y-1">
            <TransitStops
              boardName={leg.departureStation}
              alightName={leg.arrivalStation}
              intermediateStops={leg.intermediateStops}
              color={getLegColor(leg)}
            />
            <div className="text-xs text-muted-foreground">
              {t("stopsUnit", { count: leg.stopsCount })} ·{" "}
              {t("approxTime", { time: formatDuration(leg.rideMinutes) })}
            </div>
          </div>
          <FacilityHighlights items={leg.facilityHighlights} />
        </div>
      );
    case "THSR":
    case "TRA": {
      const badgeLabel =
        leg.type === "THSR"
          ? `${t("thsr")} ${leg.trainNo}`
          : `${leg.trainTypeName} ${leg.trainNo}`;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="px-2 py-0.5 rounded text-xs font-bold text-white"
              style={{ backgroundColor: getLegColor(leg) }}
            >
              {badgeLabel}
            </div>
            <WaitBadge waitInfo={leg.waitInfo} />
          </div>
          <div className="space-y-1">
            <TransitStops
              boardName={leg.departureStation}
              alightName={leg.arrivalStation}
              boardTime={leg.departureTime}
              alightTime={leg.arrivalTime}
              intermediateStops={leg.intermediateStops}
              color={getLegColor(leg)}
            />
            <div className="text-xs text-muted-foreground">
              {t("approxTime", { time: formatDuration(leg.rideMinutes) })}
            </div>
          </div>
          <FacilityHighlights items={leg.facilityHighlights} />
        </div>
      );
    }
    case "DRIVE":
    case "MOTORCYCLE":
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {leg.label ?? (leg.type === "DRIVE" ? t("drive") : t("motorcycle"))}{" "}
            {formatDistance(leg.distanceM)}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("approxTime", {
              time: formatDuration(
                leg.durationInTrafficMin ??
                  leg.durationMin ??
                  leg.durationMinutes ??
                  0,
              ),
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {[
              getPointLabel(leg.from, pointCtx, isFirst, false),
              getPointLabel(leg.to, pointCtx, false, isLast),
            ]
              .filter(Boolean)
              .join(" → ")}
          </p>
        </div>
      );
  }
}

const scoreBarColor = (value: number) => {
  if (value >= 80) return "#22c55e";
  if (value >= 60) return "#84cc16";
  if (value >= 40) return "#eab308";
  return "#f97316";
};

export const RouteCard = memo(function RouteCard({
  route,
  idx,
}: RouteCardProps) {
  const {
    setRouteSelect,
    selectRoute,
    map,
    origin,
    destination,
    originName,
    destinationName,
    userLocation,
  } = useMapStore();
  const { t } = useAppTranslation();
  const { userConfig } = useAuthStore();
  const isSelected = selectRoute?.index === idx;

  const pointCtx: PointLabelContext = {
    originPosition: origin?.position ?? null,
    destinationPosition: destination?.position ?? null,
    userLocation,
    originName,
    destinationName,
    originFallback: t("origin"),
    destinationFallback: t("destination"),
    myLocationFallback: t("myLocation"),
  };

  const label =
    route.accessibilityLabel ??
    (route.accessibilityScore != null
      ? scoreToLabel(route.accessibilityScore)
      : null);

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
            return `${t("thsr")} ${l.trainNo}`;
          case "TRA":
            return `${l.trainTypeName}${l.trainNo}`;
          case "DRIVE":
          case "MOTORCYCLE":
            return l.label ?? (l.type === "DRIVE" ? t("drive") : t("motorcycle"));
        }
        return "";
      });
    return types.join(" → ");
  }, [route.legs, t]);

  const handleSelect = () => {
    setRouteSelect({ index: idx, route });
    if (map) {
      fitRouteBounds(map, routeBoundsFromLegs(route.legs));
    }
  };

  return (
    <Card className={cn(isSelected && "ring-2 ring-primary")}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center gap-2">
          <h2
            className="text-lg font-bold truncate min-w-0"
            title={route.routeName}
          >
            {route.routeName}
          </h2>
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
            <Clock className="h-4 w-4" />
            <span className="font-bold text-sm tabular-nums">
              {formatDuration(route.totalMinutes)}
            </span>
          </div>
        </CardTitle>

        {routeSummary && (
          <p className="text-xs text-muted-foreground truncate" title={routeSummary}>
            {routeSummary}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
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
              {t("transferCount", { count: route.transferCount })}
            </Badge>
          )}
          {isSelected && <Badge>{t("selectedRoute")}</Badge>}
        </div>

        {isSelected && route.scoreComponents && (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {(
              ["facilityScore", "timeScore", "criticalFeatureScore"] as const
            ).map((key) => {
              const val = route.scoreComponents?.[key] ?? 0;
              return (
                <div
                  key={key}
                  className="text-center p-2 rounded-lg bg-muted/40 space-y-1"
                >
                  <p className="text-lg font-bold tabular-nums leading-none pt-1">
                    {val}
                  </p>
                  <div
                    aria-hidden="true"
                    className="h-1 rounded-full bg-muted overflow-hidden mx-1"
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-500 ease-out"
                      style={{
                        width: `${Math.max(0, Math.min(100, val))}%`,
                        backgroundColor: scoreBarColor(val),
                      }}
                    />
                  </div>
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
          <div className="flex flex-wrap gap-1.5 pt-1">
            {route.accessibilityHighlights.map((h) => (
              <span
                key={h}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium"
              >
                <Check className="h-3 w-3 shrink-0" />
                {h}
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="relative space-y-2">
          {route.legs.map((leg, index) => {
            const color = getLegColor(leg);
            return (
              <div key={`${leg.type}-${index}`} className="relative pl-8">
                {index !== route.legs.length - 1 && (
                  <div
                    className="absolute left-3.5 top-11 bottom-0 w-0.5 rounded-full"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                    }}
                  />
                )}

                <div className="absolute left-0 top-1">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-full border-2 bg-background"
                    style={{
                      borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
                      backgroundColor: `color-mix(in srgb, ${color} 10%, var(--background))`,
                    }}
                  >
                    <LegIcon leg={leg} />
                  </div>
                </div>

                <div className="pb-4 ml-4">
                  <LegDetail
                    leg={leg}
                    isFirst={index === 0}
                    isLast={index === route.legs.length - 1}
                    pointCtx={pointCtx}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
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
