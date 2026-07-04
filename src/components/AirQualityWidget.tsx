"use client";

import { CloudRain, Leaf, Loader2, Thermometer, Wind, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getEnvironmentInfo } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import type { AirQualityLevel, EnvironmentData } from "@/types/route";

const LEVEL_CONFIG: Record<
  AirQualityLevel,
  { label: string; labelEn: string; color: string; bg: string }
> = {
  GOOD: {
    label: "良好",
    labelEn: "Good",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-100/80 dark:bg-green-900/40",
  },
  MODERATE: {
    label: "普通",
    labelEn: "Moderate",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-100/80 dark:bg-yellow-900/40",
  },
  UNHEALTHY_SENSITIVE: {
    label: "敏感族群不健康",
    labelEn: "Unhealthy for Sensitive",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-100/80 dark:bg-orange-900/40",
  },
  UNHEALTHY: {
    label: "不健康",
    labelEn: "Unhealthy",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-100/80 dark:bg-red-900/40",
  },
  VERY_UNHEALTHY: {
    label: "非常不健康",
    labelEn: "Very Unhealthy",
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-100/80 dark:bg-purple-900/40",
  },
  HAZARDOUS: {
    label: "危害",
    labelEn: "Hazardous",
    color: "text-rose-800 dark:text-rose-400",
    bg: "bg-rose-100/80 dark:bg-rose-900/40",
  },
  "": {
    label: "未知",
    labelEn: "Unknown",
    color: "text-muted-foreground",
    bg: "bg-muted/80",
  },
};

// /a11y/environment returns quality as a Chinese label (e.g. "良好") while
// /air/air-quality uses the enum keys — accept both.
const QUALITY_ALIASES: Record<string, AirQualityLevel> = {
  良好: "GOOD",
  普通: "MODERATE",
  對敏感族群不健康: "UNHEALTHY_SENSITIVE",
  敏感族群不健康: "UNHEALTHY_SENSITIVE",
  不健康: "UNHEALTHY",
  非常不健康: "VERY_UNHEALTHY",
  危害: "HAZARDOUS",
};

function normalizeQuality(quality?: string): AirQualityLevel {
  if (!quality) return "";
  if (quality in LEVEL_CONFIG) return quality as AirQualityLevel;
  return QUALITY_ALIASES[quality] ?? "";
}

function Metric({
  Icon,
  iconClass,
  label,
  value,
  unit,
  valueClass,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  label: string;
  value: string | number;
  unit?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className={`h-4.5 w-4.5 ${iconClass}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] leading-tight text-muted-foreground">
          {label}
        </p>
        <p
          className={`text-base font-bold leading-tight tabular-nums ${valueClass ?? ""}`}
        >
          {value}
          {unit && (
            <span className="text-[11px] font-medium text-muted-foreground ml-0.5">
              {unit}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function AirQualityWidget() {
  const { t, i18n } = useAppTranslation();
  const { userLocation } = useMapStore();
  const [data, setData] = useState<EnvironmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchEnvironment = useCallback(async () => {
    if (!userLocation) return;
    setLoading(true);
    try {
      const res = await getEnvironmentInfo(userLocation.lat, userLocation.lng);
      if (res.ok && res.data) {
        setData(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    fetchEnvironment();
    const interval = setInterval(fetchEnvironment, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEnvironment]);

  if (!data && !loading) return null;

  const air = data?.airQuality.status === "ok" ? data.airQuality : null;
  const weather = data?.weather.status === "ok" ? data.weather : null;
  // No point rendering an "unknown" pill when neither source has data.
  if (!loading && !air && weather?.temperature == null) return null;

  const config = LEVEL_CONFIG[normalizeQuality(air?.quality)];
  const label = i18n.language === "en" ? config.labelEn : config.label;
  const pillConfig = air ? config : LEVEL_CONFIG[""];

  return (
    // top-24 clears the maplibre zoom control that sits in the top-right corner
    <div className="absolute top-24 right-3 z-30 flex flex-col items-end">
      <motion.button
        layout
        onClick={() => setExpanded(!expanded)}
        className="bg-background/95 backdrop-blur-md rounded-2xl shadow-lg border border-border/50 px-3 py-2 flex items-center gap-2 cursor-pointer select-none transition-colors hover:shadow-xl"
        whileTap={{ scale: 0.96 }}
        aria-label={t("airQuality", "空氣品質")}
        aria-expanded={expanded}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : air ? (
          <Leaf className={`h-4 w-4 ${pillConfig.color}`} />
        ) : (
          <CloudRain className="h-4 w-4 text-sky-500" />
        )}
        {/* Only claim an air-quality level when we actually have one. */}
        {(loading || air) && (
          <span className={`text-xs font-semibold ${pillConfig.color}`}>
            {loading ? "..." : label}
          </span>
        )}
        {!loading && weather?.temperature != null && (
          <>
            {air && <span className="w-px h-4 bg-border" />}
            <span className="text-xs font-semibold text-foreground">
              {weather.temperature}°C
            </span>
          </>
        )}
        {expanded && <X className="h-3.5 w-3.5 text-muted-foreground" />}
      </motion.button>

      <AnimatePresence>
        {expanded && data && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="mt-2 w-[168px] bg-background/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 p-3.5 space-y-3"
          >
            {weather?.windSpeed != null && (
              <Metric
                Icon={Wind}
                iconClass="text-blue-500"
                label={t("wind")}
                value={weather.windSpeed}
                unit="m/s"
              />
            )}
            {weather?.temperature != null && (
              <Metric
                Icon={Thermometer}
                iconClass="text-red-500"
                label={t("temperature")}
                value={weather.temperature}
                unit="°C"
              />
            )}
            {weather?.precipitationProbability != null && (
              <Metric
                Icon={CloudRain}
                iconClass="text-sky-500"
                label={t("precipitation")}
                value={weather.precipitationProbability}
                unit="%"
              />
            )}
            {air && (
              <Metric
                Icon={Leaf}
                iconClass="text-green-600"
                label={t("airQuality")}
                value={label}
                valueClass={config.color}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
