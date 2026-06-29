"use client";

import { Cloud, Loader2, Wind } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getAirQuality } from "@/lib/api/airQuality";
import useMapStore from "@/stores/useMapStore";
import type { AirQualityData, AirQualityLevel } from "@/types/route";

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

export default function AirQualityWidget() {
  const { t, i18n } = useAppTranslation();
  const { userLocation } = useMapStore();
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchAirQuality = useCallback(async () => {
    if (!userLocation) return;
    setLoading(true);
    try {
      const res = await getAirQuality(userLocation.lat, userLocation.lng);
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
    fetchAirQuality();
    const interval = setInterval(fetchAirQuality, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAirQuality]);

  if (!data && !loading) return null;

  const config = data ? LEVEL_CONFIG[data.quality] : LEVEL_CONFIG[""];
  const label = i18n.language === "en" ? config.labelEn : config.label;

  return (
    <div className="absolute top-14 right-3 z-30">
      <motion.button
        layout
        onClick={() => setExpanded(!expanded)}
        className={`
          ${config.bg} backdrop-blur-md
          rounded-2xl shadow-lg border border-white/20 dark:border-white/10
          px-3 py-2 flex items-center gap-2
          cursor-pointer select-none
          transition-colors hover:shadow-xl
        `}
        whileTap={{ scale: 0.96 }}
        aria-label={t("airQuality", "空氣品質")}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Wind className={`h-4 w-4 ${config.color}`} />
        )}
        <span className={`text-xs font-medium ${config.color}`}>
          {loading ? "..." : label}
        </span>

        <AnimatePresence>
          {expanded && data && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex items-center gap-1.5"
            >
              <span className="w-px h-4 bg-current opacity-20" />
              <Cloud className={`h-3.5 w-3.5 ${config.color} shrink-0`} />
              <span className={`text-xs ${config.color} whitespace-nowrap`}>
                {data.description}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
