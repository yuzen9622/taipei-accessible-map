import {
  Accessibility,
  AlertTriangle,
  Bike,
  BusIcon,
  Car,
  Check,
  ChevronDown,
  Clock,
  CornerRightUp,
  Footprints,
  MoveVertical,
  ShieldCheck,
  Toilet as ToiletIcon,
  TrainFrontIcon,
  TrainFrontTunnelIcon,
  TramFront,
  TrendingUp,
} from "lucide-react";
import { memo, useId, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppTranslation } from "@/i18n/client";
import { fitRouteBounds, routeBoundsFromLegs } from "@/lib/mapCamera";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type {
  AccessibleRoute,
  DriveStep,
  IntermediateStop,
  RouteLeg,
  SlimOsmA11y,
  WaitInfo,
  WalkStep,
} from "@/types/route";
import {
  formatDistance,
  formatDuration,
  getLegColor,
  scoreToStars,
} from "@/types/route";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import RouteReasonSummary from "./RouteReasonSummary";

type RouteCardProps = {
  route: AccessibleRoute;
  idx: number;
};

// --- Pure helpers (exported for unit testing, see __tests__/RouteCard.test.ts) ---

// exitName may already spell out the exit number (e.g. "2號出口"); appending
// again would render "2號出口 (2 號出口)". Plain `.includes()` would also
// false-positive on numeric coincidences like "12號出口" containing "2", so
// this checks the number is not part of a larger digit/letter run.
export function shouldAppendExitNumber(
  exitName: string | undefined,
  exitNumber: string | undefined,
): boolean {
  if (!exitNumber) return false;
  if (!exitName) return true;
  const escaped = exitNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![0-9A-Za-z])${escaped}(?![0-9A-Za-z])`);
  return !pattern.test(exitName);
}

const CONFIDENCE_LABEL_KEY: Record<
  NonNullable<AccessibleRoute["dataConfidence"]>,
  string
> = {
  high: "confidenceHigh",
  medium: "confidenceMedium",
  low: "confidenceLow",
};

export function getConfidenceLabelKey(
  confidence: AccessibleRoute["dataConfidence"],
): string | null {
  return confidence ? (CONFIDENCE_LABEL_KEY[confidence] ?? null) : null;
}

// Order-preserving, first-seen-wins de-duplication of a11y facility
// categories, used to render one icon per distinct category instead of one
// per facility.
export function dedupeA11yCategories(
  items: SlimOsmA11y[] | undefined,
): SlimOsmA11y["category"][] {
  if (!items?.length) return [];
  const seen = new Set<SlimOsmA11y["category"]>();
  const out: SlimOsmA11y["category"][] = [];
  for (const item of items) {
    if (!seen.has(item.category)) {
      seen.add(item.category);
      out.push(item.category);
    }
  }
  return out;
}

const A11Y_CATEGORY_ICON: Record<
  SlimOsmA11y["category"],
  typeof Accessibility
> = {
  wheelchair_accessible: Accessibility,
  elevator: MoveVertical,
  ramp: TrendingUp,
  kerb_cut: CornerRightUp,
  toilet: ToiletIcon,
};

function getA11yCategoryLabelKey(category: SlimOsmA11y["category"]): string {
  switch (category) {
    case "wheelchair_accessible":
      return "wheelchairAccess";
    case "elevator":
      return "elevator";
    case "ramp":
      return "ramp";
    case "kerb_cut":
      return "kerbCut";
    case "toilet":
      return "toilet";
  }
}

function getWheelchairStatusKey(
  wheelchair: SlimOsmA11y["wheelchair"] | undefined,
): string | null {
  switch (wheelchair) {
    case "yes":
      return "wheelchairYes";
    case "limited":
      return "wheelchairLimited";
    case "no":
      return "wheelchairNo";
    default:
      return null;
  }
}

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

function A11yStationIcons({
  items,
  ariaLabel,
}: {
  items?: SlimOsmA11y[];
  ariaLabel: string;
}) {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const categories = dedupeA11yCategories(items);

  if (categories.length === 0) return null;

  return (
    <div className="ml-2.5">
      <div className="flex items-center gap-1">
        {categories.map((category) => {
          const Icon = A11Y_CATEGORY_ICON[category];
          return (
            <Icon
              key={category}
              className="h-3 w-3 text-blue-600 dark:text-blue-400"
              aria-label={t(getA11yCategoryLabelKey(category)) ?? category}
            />
          );
        })}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-label={`${ariaLabel} ${t("viewA11yDetails") ?? "查看無障礙設施詳情"}`}
          className="text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200 ease-out motion-reduce:transition-none",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </div>
      <div
        id={listId}
        aria-hidden={!isOpen}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <ul className="pl-2 my-1 space-y-1 text-xs text-muted-foreground">
            {(items ?? []).map((item, idx) => {
              const wheelchairKey = getWheelchairStatusKey(item.wheelchair);
              return (
                <li key={item.osmId || `${item.category}-${idx}`}>
                  {item.name || t(getA11yCategoryLabelKey(item.category))}
                  {wheelchairKey && ` · ${t(wheelchairKey)}`}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TransitStops({
  boardName,
  alightName,
  boardTime,
  alightTime,
  intermediateStops,
  color,
  departureA11y,
  arrivalA11y,
  isSelected,
}: {
  boardName?: string;
  alightName?: string;
  boardTime?: string;
  alightTime?: string;
  intermediateStops?: IntermediateStop[];
  color: string;
  departureA11y?: SlimOsmA11y[];
  arrivalA11y?: SlimOsmA11y[];
  isSelected?: boolean;
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
        {boardTime && (
          <span className="text-muted-foreground">{boardTime}</span>
        )}
      </div>
      {isSelected && (
        <A11yStationIcons
          items={departureA11y}
          ariaLabel={t("departureA11yLabel") ?? "出發站無障礙設施"}
        />
      )}
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
      {isSelected && (
        <A11yStationIcons
          items={arrivalA11y}
          ariaLabel={t("arrivalA11yLabel") ?? "到達站無障礙設施"}
        />
      )}
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

function WalkStepsList({ steps }: { steps?: WalkStep[] }) {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-1">
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
        <span>{t("viewWalkSteps") ?? "查看步行細節"}</span>
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
          <ul className="pl-3.5 my-2 space-y-1.5 border-l border-muted-foreground/30 ml-3.5">
            {steps.map((step, idx) => (
              <li
                key={`${step.streetName || step.instruction || "step"}-${idx}`}
                className="text-xs text-muted-foreground"
              >
                <span className="text-foreground">
                  {step.instruction ||
                    [step.relativeDirection, step.streetName]
                      .filter(Boolean)
                      .join(" ")}
                </span>
                {" · "}
                {formatDistance(step.distanceM)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function DriveStepsList({ steps }: { steps?: DriveStep[] }) {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-1">
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
        <span>{t("viewDriveSteps") ?? "查看路線細節"}</span>
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
          <ul className="pl-3.5 my-2 space-y-1.5 border-l border-muted-foreground/30 ml-3.5">
            {steps.map((step, idx) => (
              <li
                key={`${step.instruction || "step"}-${idx}`}
                className="text-xs text-muted-foreground"
              >
                <span className="text-foreground">{step.instruction}</span>
                {" · "}
                {formatDistance(step.distanceM)} ·{" "}
                {formatDuration(step.durationMin)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function LegDetail({
  leg,
  isFirst,
  isLast,
  pointCtx,
  isSelected,
}: {
  leg: RouteLeg;
  isFirst: boolean;
  isLast: boolean;
  pointCtx: PointLabelContext;
  isSelected: boolean;
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
              {shouldAppendExitNumber(
                leg.exitInfo.exitName,
                leg.exitInfo.exitNumber,
              ) && (
                <>
                  {t("exitNumber", { number: leg.exitInfo.exitNumber }) ??
                    `${leg.exitInfo.exitNumber} 號出口`}
                  ・
                </>
              )}
              {leg.exitInfo.type === "elevator" ? t("elevator") : t("ramp")})
            </p>
          )}
          {!!leg.a11yFacilities?.length && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <span aria-hidden>♿</span>{" "}
              {t("a11yFacilitiesAlong", { count: leg.a11yFacilities.length })}
            </p>
          )}
          {isSelected && <WalkStepsList steps={leg.steps} />}
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
            departureA11y={leg.departureStopA11y}
            arrivalA11y={leg.arrivalStopA11y}
            isSelected={isSelected}
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
              departureA11y={leg.departureStationA11y}
              arrivalA11y={leg.arrivalStationA11y}
              isSelected={isSelected}
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
              departureA11y={leg.departureStationA11y}
              arrivalA11y={leg.arrivalStationA11y}
              isSelected={isSelected}
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
          {isSelected && <DriveStepsList steps={leg.steps} />}
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

const LABEL_TO_SCORE: Record<string, number> = {
  excellent: 90,
  good: 70,
  fair: 50,
  poor: 30,
  critical: 10,
};

const STAR_COLOR: Record<number, string> = {
  5: "text-emerald-600 dark:text-emerald-400",
  4: "text-lime-600 dark:text-lime-400",
  3: "text-yellow-600 dark:text-yellow-400",
  2: "text-orange-600 dark:text-orange-400",
  1: "text-red-600 dark:text-red-400",
};

function StarRating({
  filled,
  colorClass,
  ariaLabel,
}: {
  filled: number;
  colorClass: string;
  ariaLabel: string;
}) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={ariaLabel}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={cn(
            "h-4 w-4",
            i < filled ? colorClass : "text-muted-foreground/25",
          )}
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.27 5.23 15.71l.91-5.32L2.27 6.62l5.34-.78z"
          />
        </svg>
      ))}
    </span>
  );
}

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
  } = useMapStore(
    useShallow((s) => ({
      setRouteSelect: s.setRouteSelect,
      selectRoute: s.selectRoute,
      map: s.map,
      origin: s.origin,
      destination: s.destination,
      originName: s.originName,
      destinationName: s.destinationName,
      userLocation: s.userLocation,
    })),
  );
  const { t } = useAppTranslation();
  const isSelected = selectRoute?.index === idx;
  const [scoreOpen, setScoreOpen] = useState(false);
  const scoreDetailId = useId();

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

  const effectiveScore =
    route.accessibilityScore ??
    (route.accessibilityLabel
      ? LABEL_TO_SCORE[route.accessibilityLabel]
      : undefined);
  const stars = effectiveScore != null ? scoreToStars(effectiveScore) : null;
  const starColor = stars ? STAR_COLOR[stars] ?? STAR_COLOR[1] : null;

  const confidenceLabelKey = getConfidenceLabelKey(route.dataConfidence);
  const confidenceLabelText = confidenceLabelKey
    ? (t(confidenceLabelKey) ?? route.dataConfidence)
    : route.dataConfidence;

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
            return (
              l.label ?? (l.type === "DRIVE" ? t("drive") : t("motorcycle"))
            );
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
    <Card
      className={cn(
        "transition-shadow",
        isSelected ? "ring-2 ring-primary" : "cursor-pointer hover:shadow-md",
      )}
      {...(!isSelected && {
        role: "button",
        tabIndex: 0,
        "aria-label": `${t("selectRoute")}: ${route.routeName}`,
        onClick: handleSelect,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect();
          }
        },
      })}
    >
      {/* ── Level 1: Scan layer (always visible) ── */}
      <CardHeader className="grid-cols-1">
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
          <p
            className="text-xs text-muted-foreground truncate min-w-0"
            title={routeSummary}
          >
            {routeSummary}
          </p>
        )}

        {stars != null && starColor && (
          <div className="flex items-center gap-2">
            <StarRating
              filled={stars}
              colorClass={starColor}
              ariaLabel={t("starAriaLabel", { filled: stars }) ?? `${stars}/5`}
            />
            <span className={cn("text-sm font-bold", starColor)}>
              {t(`starLabel${stars}`)}
            </span>
          </div>
        )}
      </CardHeader>

      {/* ── Level 2: Decision layer (on select) ── */}
      {isSelected && (
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center gap-2 flex-wrap">
            {route.transferCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {t("transferCount", { count: route.transferCount })}
              </Badge>
            )}
            {route.totalWalkDistanceM != null && (
              <Badge
                variant="outline"
                className="text-xs gap-1"
                aria-label={
                  t("totalWalkDistance", {
                    distance: formatDistance(route.totalWalkDistanceM),
                  }) ?? `總步行距離 ${formatDistance(route.totalWalkDistanceM)}`
                }
              >
                <Footprints className="h-3 w-3" aria-hidden />
                {formatDistance(route.totalWalkDistanceM)}
              </Badge>
            )}
            {route.dataConfidence && (
              <Badge variant="outline" className="text-xs">
                {t("dataConfidence") ?? "資料可信度"}
                {t("labelColon")}
                {confidenceLabelText}
              </Badge>
            )}
            <RouteReasonSummary route={route} />
            <Badge>{t("selectedRoute")}</Badge>
          </div>

          {/* Leg overview */}
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
                      isSelected={isSelected}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Level 3: Professional layer (opt-in disclosure) ── */}
          {(route.scoreComponents ||
            (route.accessibilityHighlights?.length ?? 0) > 0) && (
            <div className="border-t pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setScoreOpen((v) => !v);
                }}
                aria-expanded={scoreOpen}
                aria-controls={scoreDetailId}
                className="flex w-full items-center justify-between gap-2 px-1 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  {t("scoreDetails")}
                  {effectiveScore != null && (
                    <span className="tabular-nums font-semibold">
                      {effectiveScore}/100
                    </span>
                  )}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    scoreOpen && "rotate-180",
                  )}
                />
              </button>
              {scoreOpen && (
                <div id={scoreDetailId} className="space-y-3 pt-1">
                  {route.accessibilityHighlights?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {route.accessibilityHighlights.map((h) => {
                        const isWarning =
                          h.includes("請留意") || h.includes("無法");
                        return (
                          <span
                            key={h}
                            className={
                              isWarning
                                ? "inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 text-xs font-medium"
                                : "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium"
                            }
                          >
                            {isWarning ? (
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                            ) : (
                              <Check className="h-3 w-3 shrink-0" />
                            )}
                            {h}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {route.scoreComponents && (
                  <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      "facilityScore",
                      "timeScore",
                      "criticalFeatureScore",
                    ] as const
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
                </div>
              )}
            </div>
          )}

          {!!route.scoreWarnings?.length && (
            <div className="space-y-1">
              {route.scoreWarnings.map((warning) => (
                <p
                  key={warning}
                  className="flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle
                    className="h-3 w-3 shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <span>{warning}</span>
                </p>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSelect();
              }}
              disabled={isSelected}
              variant="secondary"
            >
              {t("selectedRoute")}
            </Button>
          </div>

          {route.attribution && (
            <p className="text-xs text-muted-foreground pt-2">
              {route.attribution}
            </p>
          )}
        </CardContent>
      )}

      {/* Unselected: show select button inline */}
      {!isSelected && (
        <CardContent className="pt-0">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleSelect();
            }}
            variant="default"
            className="w-full"
          >
            {t("selectRoute")}
          </Button>
        </CardContent>
      )}
    </Card>
  );
});
RouteCard.displayName = "RouteCard";
