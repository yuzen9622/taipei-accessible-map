"use client";

import { AlertTriangle, ChevronDown, Clock, Info } from "lucide-react";
import { useId, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { MetroAlert, MetroAlertResult } from "@/types/route";

// ── Pure helpers (exported for unit tests) ───────────────────────────────────

/**
 * TDX metro alert status → presentation tier.
 * 2 = 實施中 (active), 1 = 尚未實施 (upcoming), anything else is unknown.
 */
export type AlertTier = "active" | "upcoming" | "unknown";

export function getAlertTier(status: number): AlertTier {
  if (status === 2) return "active";
  if (status === 1) return "upcoming";
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

function AlertStatusChip({ alert }: { alert: MetroAlert }) {
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
function AlertDetailRow({ alert }: { alert: MetroAlert }) {
  const { t } = useAppTranslation();
  const tier = getAlertTier(alert.status);
  const { icon: Icon, iconColor } = TIER_STYLE[tier];
  const stationNames = alert.stations
    .map((s) => s.name ?? s.id)
    .filter(Boolean)
    .join("、");

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", iconColor)} aria-hidden />
        <p className="text-xs font-semibold text-foreground truncate min-w-0">
          {alert.title}
        </p>
        <AlertStatusChip alert={alert} />
      </div>
      {alert.description && (
        <p className="text-xs text-muted-foreground leading-relaxed pl-5">
          {alert.description}
        </p>
      )}
      {(stationNames || alert.updateTime) && (
        <p className="text-[11px] text-muted-foreground/80 pl-5">
          {stationNames &&
            `${t("affectedStations") ?? "影響站點"}: ${stationNames}`}
          {stationNames && alert.updateTime && " · "}
          {alert.updateTime &&
            `${t("alertUpdatedTime") ?? "更新"}: ${formatAlertTime(alert.updateTime)}`}
        </p>
      )}
    </div>
  );
}

// ── Top-level system banner (route results header) ───────────────────────────

export function MetroAlertsBanner({ alerts }: { alerts: MetroAlertResult[] }) {
  const { t } = useAppTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  if (!alerts?.length) return null;

  const count = alerts.reduce((n, r) => n + r.alerts.length, 0);
  const systems = alerts.map((r) => r.railSystem).join("、");

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={`${t("transitAlerts")} ${count}`}
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
            {t("alertCount", { count })}
            {" · "}
            {systems}
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
            {alerts.map((group) => (
              <div key={group.railSystem} className="space-y-1.5">
                <p className="text-[11px] font-bold text-amber-700/90 dark:text-amber-400/90">
                  {group.railSystem}
                </p>
                {group.alerts.map((alert) => (
                  <AlertDetailRow key={alert.alertId} alert={alert} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Per-leg notice (inside a METRO leg detail) ───────────────────────────────

export function LegAlertNotice({ alerts }: { alerts?: MetroAlert[] }) {
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
            : "border-border bg-muted/40",
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
