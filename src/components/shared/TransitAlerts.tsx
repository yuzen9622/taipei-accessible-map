"use client";

import {
  AlertTriangle,
  ChevronDown,
  Clock,
  ExternalLink,
  Info,
} from "lucide-react";
import { useId, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { MetroAlertResult } from "@/types/route";
import type {
  MatchedAlert,
  MatchKind,
  MetroAlert,
  TransitAlert,
} from "@/types/transit-alert";

// ── Pure helpers (exported for unit tests) ───────────────────────────────────

/**
 * Transit alert status → presentation tier.
 * 2 / "2" / "active" / "in_effect" = 實施中 (active)
 * 1 / "1" / "upcoming" = 尚未實施 (upcoming)
 * anything else is unknown.
 */
export type AlertTier = "active" | "upcoming" | "unknown";

export function getAlertTier(status?: number | string | null): AlertTier {
  if (
    status === 2 ||
    status === "2" ||
    status === "active" ||
    status === "in_effect"
  ) {
    return "active";
  }
  if (status === 1 || status === "1" || status === "upcoming") {
    return "upcoming";
  }
  return "unknown";
}

/** i18n key for the status label chip; null when the tier has no label. */
export function getAlertStatusLabelKey(tier: AlertTier): string | null {
  switch (tier) {
    case "active":
      return "alertStatusActive";
    case "upcoming":
      return "alertStatusUpcoming";
    default:
      return null;
  }
}

/** i18n key for the matchKind chip; null when absent or unknown. */
export function getMatchKindLabelKey(matchKind?: MatchKind): string | null {
  switch (matchKind) {
    case "route":
      return "alertMatchRoute";
    case "stop":
      return "alertMatchStop";
    case "station":
      return "alertMatchStation";
    case "line":
      return "alertMatchLine";
    case "train":
      return "alertMatchTrain";
    case "section":
      return "alertMatchSection";
    default:
      return null;
  }
}

/** Compact update-time: "10:45" when today, "8/15 10:45" otherwise. */
export function formatAlertTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? `${hh}:${mm}`
    : `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

export function formatAlertDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    return `${mm}/${dd}`;
  }
  return `${mm}/${dd} ${hh}:${min}`;
}

export function formatAlertDateRange(
  startTime?: string | null,
  endTime?: string | null,
): string | null {
  const startStr = formatAlertDate(startTime);
  const endStr = formatAlertDate(endTime);
  if (startStr && endStr) return `${startStr} ~ ${endStr}`;
  if (startStr) return `${startStr} 起`;
  if (endStr) return `至 ${endStr}`;
  return null;
}

export function isMetroAlert(alert: TransitAlert): alert is MetroAlert {
  return "stations" in alert || "lines" in alert;
}

// ── Shared pieces ────────────────────────────────────────────────────────────

const TIER_STYLE: Record<
  AlertTier,
  { icon: typeof AlertTriangle; chip: string; iconColor: string }
> = {
  active: {
    icon: AlertTriangle,
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  upcoming: {
    icon: Clock,
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  unknown: {
    icon: Info,
    chip: "bg-muted text-muted-foreground",
    iconColor: "text-muted-foreground",
  },
};

const DISCLOSURE_CLS =
  "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none";

export function AlertStatusChip({ alert }: { alert: TransitAlert }) {
  const { t } = useAppTranslation();
  const tier = getAlertTier(alert.status);
  const labelKey = getAlertStatusLabelKey(tier);
  if (!labelKey) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0",
        TIER_STYLE[tier].chip,
      )}
    >
      {t(labelKey)}
    </span>
  );
}

/** Full detail row for a single alert (used by both the banner and the leg notice). */
export function AlertDetailRow({ alert }: { alert: TransitAlert }) {
  const { t } = useAppTranslation();
  const tier = getAlertTier(alert.status);
  const { icon: Icon, iconColor } = TIER_STYLE[tier];

  const metro = isMetroAlert(alert) ? alert : null;
  const matched = !isMetroAlert(alert) ? (alert as MatchedAlert) : null;

  const stationNames = metro?.stations
    ?.map((s) => s.name ?? s.id)
    ?.filter(Boolean)
    ?.join("、");
  const lineNames = metro?.lines?.filter(Boolean)?.join("、");

  const matchKindKey = matched?.matchKind
    ? getMatchKindLabelKey(matched.matchKind)
    : null;
  const matchKindText = matchKindKey ? t(matchKindKey) : matched?.matchKind;

  const timeRangeText = formatAlertDateRange(
    matched?.startTime,
    matched?.endTime,
  );
  const updateTimeText = metro?.updateTime && formatAlertTime(metro.updateTime);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} aria-hidden />
        <p className="text-xs font-semibold text-foreground truncate min-w-0">
          {alert.title}
        </p>
        <AlertStatusChip alert={alert} />
        {matchKindText && (
          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-foreground/10 text-muted-foreground shrink-0">
            {matchKindText}
          </span>
        )}
      </div>

      {alert.description && (
        <p className="text-xs text-muted-foreground leading-relaxed pl-5">
          {alert.description}
        </p>
      )}

      {matched?.reason && (
        <p className="text-[11px] text-muted-foreground/90 pl-5">
          {t("alertReason") ? `${t("alertReason")}: ` : "原因: "}
          {matched.reason}
        </p>
      )}

      {(stationNames ||
        lineNames ||
        updateTimeText ||
        timeRangeText ||
        matched?.alertUrl) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground/80 pl-5">
          {stationNames && (
            <span>
              {`${t("affectedStations") ?? "影響站點"}: ${stationNames}`}
            </span>
          )}
          {lineNames && !stationNames && (
            <span>{`${t("affectedLines") ?? "影響路線"}: ${lineNames}`}</span>
          )}
          {timeRangeText && (
            <span>{`${t("alertTimeRange") ?? "期間"}: ${timeRangeText}`}</span>
          )}
          {updateTimeText && (
            <span>
              {`${t("alertUpdatedTime") ?? "更新"}: ${updateTimeText}`}
            </span>
          )}
          {matched?.alertUrl && (
            <a
              href={matched.alertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              <span>{t("alertDetailLink") ?? "詳細公告"}</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Top-level system banner (route results header) ───────────────────────────

export function TransitAlertsBanner({
  metroAlerts,
  transitAlerts,
}: {
  metroAlerts?: MetroAlertResult[] | null;
  transitAlerts?: MatchedAlert[] | null;
}) {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  const metroCount =
    metroAlerts?.reduce((n, r) => n + (r.alerts?.length ?? 0), 0) ?? 0;
  const transitCount = transitAlerts?.length ?? 0;
  const totalCount = metroCount + transitCount;

  if (totalCount === 0) return null;

  const metroSystems = metroAlerts?.map((r) => r.railSystem) ?? [];
  const systemLabels = [
    ...metroSystems,
    ...(transitCount > 0 && metroSystems.length === 0
      ? [t("generalTransitAlerts") ?? "營運通阻"]
      : []),
  ].join("、");

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={`${t("transitAlerts")} ${totalCount}`}
        className="flex w-full items-center gap-2 px-3 py-2.5 lg:py-2 rounded-xl text-left transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-400 truncate min-w-0">
          {t("transitAlerts")}
          <span className="text-amber-700/80 dark:text-amber-400/80">
            {" · "}
            {t("alertCount", { count: totalCount })}
            {systemLabels && ` · ${systemLabels}`}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-amber-600/70 dark:text-amber-400/70 transition-transform duration-200 ease-out motion-reduce:transition-none ml-auto",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div
        id={listId}
        aria-hidden={!isOpen}
        className={cn(
          DISCLOSURE_CLS,
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 space-y-3">
            {metroAlerts?.map((group) => (
              <div key={group.railSystem} className="space-y-1.5">
                <p className="text-[11px] font-bold text-amber-700/90 dark:text-amber-400/90">
                  {group.railSystem}
                </p>
                {group.alerts.map((alert) => (
                  <AlertDetailRow key={alert.alertId} alert={alert} />
                ))}
              </div>
            ))}

            {transitAlerts && transitAlerts.length > 0 && (
              <div className="space-y-1.5">
                {metroAlerts && metroAlerts.length > 0 && (
                  <p className="text-[11px] font-bold text-amber-700/90 dark:text-amber-400/90">
                    {t("generalTransitAlerts") ?? "各運具通阻"}
                  </p>
                )}
                {transitAlerts.map((alert) => (
                  <AlertDetailRow key={alert.alertId} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Legacy alias for backward compatibility. */
export function MetroAlertsBanner({
  alerts,
  transitAlerts,
}: {
  alerts?: MetroAlertResult[] | null;
  transitAlerts?: MatchedAlert[] | null;
}) {
  return (
    <TransitAlertsBanner metroAlerts={alerts} transitAlerts={transitAlerts} />
  );
}

// ── Per-leg notice (inside a transit leg detail) ─────────────────────────────

export function LegAlertNotice({ alerts }: { alerts?: TransitAlert[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  if (!alerts?.length) return null;

  const first = alerts[0];
  const tier = getAlertTier(first.status);
  const { icon: Icon, iconColor } = TIER_STYLE[tier];
  const moreCount = alerts.length - 1;

  return (
    <div
      className={cn(
        "rounded-lg border",
        tier === "active"
          ? "border-amber-500/30 bg-amber-500/10"
          : tier === "upcoming"
            ? "border-sky-500/30 bg-sky-500/10"
            : "border-amber-500/30 bg-amber-500/10",
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={`${first.title}${moreCount > 0 ? ` (+${moreCount})` : ""}`}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 lg:py-1.5 rounded-lg text-left transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} aria-hidden />
        <span className="text-xs font-medium text-foreground truncate min-w-0">
          {first.title}
        </span>
        {moreCount > 0 && (
          <span
            className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0 bg-foreground/10 text-muted-foreground"
            aria-hidden
          >
            +{moreCount}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none ml-auto",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div
        id={listId}
        aria-hidden={!isOpen}
        className={cn(
          DISCLOSURE_CLS,
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2.5 pb-2 space-y-2">
            {alerts.map((alert) => (
              <AlertDetailRow key={alert.alertId} alert={alert} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
