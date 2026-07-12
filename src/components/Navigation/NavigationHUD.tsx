"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpLeft,
  ArrowUpRight,
  Bus,
  CheckCircle2,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  List,
  Navigation,
  Redo2,
  RefreshCw,
  Square,
  TramFront,
  Undo2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useComputeRoute from "@/hook/useComputeRoute";
import { useAppTranslation } from "@/i18n/client";
import { getNearbyHazardReports } from "@/lib/api/a11y";
import { haversineMeters } from "@/lib/geo";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";
import type { LatLng } from "@/types";
import {
  formatDistance,
  type HazardReport,
  type NavInstruction,
  type SlimOsmA11y,
} from "@/types/route";

const FACILITY_ALERT_M = 250;
const HAZARD_ALERT_M = 200;
const HAZARD_POLL_MS = 60_000;

function stepIcon(step: NavInstruction | undefined) {
  if (!step) return ArrowUp;
  switch (step.type) {
    case "arrive":
      return Flag;
    case "depart":
      return Navigation;
    case "transit_board":
    case "transit_alight":
      return step.legType === "BUS" ? Bus : TramFront;
    case "facility":
      return ArrowUpDown;
    default:
      break;
  }
  switch (step.relativeDirection) {
    case "正前方":
      return ArrowUp;
    case "左前方":
      return ArrowUpLeft;
    case "右前方":
      return ArrowUpRight;
    case "左側":
      return CornerUpLeft;
    case "右側":
      return CornerUpRight;
    case "左後方":
      return Undo2;
    case "右後方":
      return Redo2;
    case "正後方":
      return ArrowDown;
    default:
      return ArrowUp;
  }
}

const FACILITY_LABEL_KEY: Record<SlimOsmA11y["category"], string> = {
  elevator: "elevator",
  ramp: "ramp",
  toilet: "toilet",
  kerb_cut: "facility",
  wheelchair_accessible: "facility",
};

/**
 * Map-first navigation chrome, per the approved redesign: a Google-Maps-style
 * top instruction banner with a "then" preview, accessibility-aware proximity
 * pills, and a bottom ETA status bar. Mounted only while navigating.
 */
export default function NavigationHUD() {
  const { t, i18n } = useAppTranslation();
  const { selectRoute, setIsNavigating, userLocation } = useMapStore();
  const { handleComputeRoute, isLoading } = useComputeRoute();

  const instructions = useNavStore((s) => s.instructions);
  const currentStep = useNavStore((s) => s.currentStepIndex);
  const distanceToNextM = useNavStore((s) => s.distanceToNextM);
  const remainingM = useNavStore((s) => s.remainingM);
  const routeTotalM = useNavStore((s) => s.routeTotalM);
  const isOffRoute = useNavStore((s) => s.isOffRoute);
  const arrived = useNavStore((s) => s.arrived);
  const voiceEnabled = useNavStore((s) => s.voiceEnabled);
  const stepListOpen = useNavStore((s) => s.stepListOpen);
  const setStepListOpen = useNavStore((s) => s.setStepListOpen);
  const warnings = useNavStore((s) => s.warnings);

  const route = selectRoute?.route;

  const activeNavWarnings = useMemo(() => {
    const list: string[] = [];
    if (!warnings) return list;
    const walkStepsUnavailable =
      warnings.includes("WALK_STEPS_UNAVAILABLE") ||
      warnings.includes("ORS_STEPS_UNAVAILABLE");
    if (walkStepsUnavailable) {
      list.push(t("walkStepsUnavailable"));
    }
    if (warnings.includes("ROAD_STEPS_UNAVAILABLE")) {
      list.push(t("roadStepsUnavailable"));
    }
    return list;
  }, [warnings, t]);
  const step = instructions[currentStep];
  const nextStep = instructions[currentStep + 1];
  const StepIcon = stepIcon(step);
  const NextIcon = stepIcon(nextStep);

  // ---- Voice announcements (state lives in the store; UI toggle sits in the
  // right-hand control stack) ----
  const synthRef = useRef<SpeechSynthesis | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined")
      synthRef.current = window.speechSynthesis;
    return () => synthRef.current?.cancel();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!useNavStore.getState().voiceEnabled || !synthRef.current) return;
      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = i18n.language === "zh-TW" ? "zh-TW" : "en-US";
      utter.rate = 0.9;
      synthRef.current.speak(utter);
    },
    [i18n.language],
  );

  useEffect(() => {
    const s = instructions[currentStep];
    if (s) speak(s.text);
  }, [currentStep, instructions, speak]);

  useEffect(() => {
    if (arrived) speak(t("arrivedDesc"));
  }, [arrived, speak, t]);

  useEffect(() => {
    if (!voiceEnabled) synthRef.current?.cancel();
  }, [voiceEnabled]);

  // ---- Recalculate (off-route strip + hazard alternate-route button) ----
  const destination = useMapStore((s) => s.destination);
  const handleRecalculate = useCallback(() => {
    if (!destination) {
      toast.error(t("recalculateFailed"));
      return;
    }
    handleComputeRoute({ destination: destination.position });
  }, [destination, handleComputeRoute, t]);

  // ---- Upcoming accessible facility (from the route's own walk-leg data) ----
  const routeFacilities = useMemo(() => {
    if (!route) return [];
    const seen = new Set<string>();
    const out: { name: string; position: LatLng }[] = [];
    for (const leg of route.legs) {
      if (leg.type !== "WALK") continue;
      for (const f of leg.a11yFacilities ?? []) {
        if (seen.has(f.osmId)) continue;
        seen.add(f.osmId);
        out.push({
          name: t(FACILITY_LABEL_KEY[f.category] ?? "facility"),
          position: {
            lat: f.location.coordinates[1],
            lng: f.location.coordinates[0],
          },
        });
      }
    }
    return out;
  }, [route, t]);

  const facilityAlert = useMemo(() => {
    if (!userLocation || routeFacilities.length === 0) return null;
    let best: { name: string; distance: number } | null = null;
    for (const f of routeFacilities) {
      const d = haversineMeters(userLocation, f.position);
      if (d < FACILITY_ALERT_M && (!best || d < best.distance)) {
        best = { name: f.name, distance: d };
      }
    }
    return best;
  }, [routeFacilities, userLocation]);

  // ---- Nearby hazard reports (polled while navigating) ----
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      const loc = useMapStore.getState().userLocation;
      if (!loc) return;
      getNearbyHazardReports(loc.lat, loc.lng, HAZARD_ALERT_M)
        .then((res) => {
          if (!cancelled && res.ok && res.data?.reports)
            setHazards(res.data.reports);
        })
        .catch(() => {});
    };
    poll();
    const timer = setInterval(poll, HAZARD_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const hazardAlert = useMemo(() => {
    if (!userLocation || hazards.length === 0) return null;
    let best: { type: string; distance: number } | null = null;
    for (const h of hazards) {
      const d = haversineMeters(userLocation, {
        lat: h.reportedLocation.coordinates[1],
        lng: h.reportedLocation.coordinates[0],
      });
      if (d < HAZARD_ALERT_M && (!best || d < best.distance)) {
        best = {
          type: t(h.hazardType === "data_error" ? "dataError" : h.hazardType),
          distance: d,
        };
      }
    }
    return best;
  }, [hazards, userLocation, t]);

  // ---- ETA (proportional estimate over the whole route) ----
  const remainMinutes = useMemo(() => {
    if (!route) return null;
    if (remainingM == null || !routeTotalM) return route.totalMinutes;
    return Math.max(
      1,
      Math.round(route.totalMinutes * (remainingM / routeTotalM)),
    );
  }, [route, remainingM, routeTotalM]);

  const etaText = useMemo(() => {
    if (remainMinutes == null) return null;
    const eta = new Date(Date.now() + remainMinutes * 60_000);
    return eta.toLocaleTimeString(i18n.language === "zh-TW" ? "zh-TW" : "en", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [remainMinutes, i18n.language]);

  return (
    <>
      {/* ===== Top instruction banner ===== */}
      <div className="absolute top-3 left-3 right-3 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[560px] z-40 space-y-2">
        {arrived ? (
          <div className="bg-green-600 text-white rounded-2xl shadow-xl p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold leading-tight">{t("arrived")}</p>
              <p className="text-sm text-white/80">{t("arrivedDesc")}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsNavigating(false)}
              className="shrink-0 bg-white/20 hover:bg-white/30 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            >
              {t("endNav")}
            </button>
          </div>
        ) : (
          <div className="bg-primary text-primary-foreground rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              <StepIcon className="h-9 w-9 shrink-0" />
              <div className="flex-1 min-w-0">
                {distanceToNextM != null && (
                  <p className="text-3xl font-bold leading-none mb-1 tabular-nums">
                    {formatDistance(distanceToNextM)}
                  </p>
                )}
                <p className="text-sm font-medium leading-snug text-primary-foreground/90 line-clamp-2">
                  {step?.text ?? t("preparingNav")}
                </p>
              </div>
              {instructions.length > 0 && (
                <span className="shrink-0 text-xs bg-black/20 rounded-full px-2.5 py-1 text-primary-foreground/80">
                  {t("stepOf", {
                    current: currentStep + 1,
                    total: instructions.length,
                  })}
                </span>
              )}
            </div>
            {nextStep && (
              <div className="flex items-center gap-2 bg-black/20 px-5 py-2">
                <span className="text-xs text-primary-foreground/60 shrink-0">
                  {t("then")}
                </span>
                <NextIcon className="h-4 w-4 shrink-0 text-primary-foreground/80" />
                <span className="text-[13px] text-primary-foreground/90 truncate">
                  {nextStep.text}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Off-route strip */}
        {isOffRoute && !arrived && (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/95 text-white shadow-lg">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-semibold">{t("offRoute")}</p>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleRecalculate}
              className="shrink-0 flex items-center gap-1.5 bg-white/25 hover:bg-white/35 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              {t("recalculate")}
            </button>
          </div>
        )}

        {/* Step Unavailable Warnings */}
        {!arrived &&
          activeNavWarnings.map((wMsg) => (
            <div
              key={wMsg}
              className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/95 text-white shadow-lg"
            >
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm font-semibold">{wMsg}</p>
            </div>
          ))}
      </div>

      {/* ===== Accessibility-aware proximity pills ===== */}
      <div className="absolute left-3 bottom-[140px] lg:bottom-[104px] z-30 flex flex-col items-start gap-2 max-w-[80%]">
        <AnimatePresence>
          {facilityAlert && !arrived && (
            <motion.span
              key="facility"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="inline-flex items-center gap-2 bg-green-100/95 dark:bg-green-900/90 text-green-800 dark:text-green-200 text-[13px] font-medium px-3.5 py-2 rounded-full shadow-md backdrop-blur-sm"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("facilityAhead", {
                distance: formatDistance(facilityAlert.distance),
                name: facilityAlert.name,
              })}
            </motion.span>
          )}
          {hazardAlert && !arrived && (
            <motion.span
              key="hazard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="inline-flex items-center gap-2 bg-amber-100/95 dark:bg-amber-900/90 text-amber-800 dark:text-amber-200 text-[13px] font-medium px-3.5 py-2 rounded-full shadow-md backdrop-blur-sm"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {t("hazardAhead", {
                distance: formatDistance(hazardAlert.distance),
                type: hazardAlert.type,
              })}
              <button
                type="button"
                onClick={handleRecalculate}
                className="underline font-semibold whitespace-nowrap"
              >
                {t("viewAlternative")}
              </button>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ===== Bottom ETA status bar ===== */}
      <div className="absolute bottom-3 left-3 right-3 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[560px] z-40">
        <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold leading-tight text-green-600 dark:text-green-400 tabular-nums">
              {remainMinutes != null
                ? t("minutesLeft", { count: remainMinutes })
                : "…"}
            </p>
            <p className="text-xs text-muted-foreground truncate tabular-nums">
              {remainingM != null && `${formatDistance(remainingM)} · `}
              {etaText && t("etaArrive", { time: etaText })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStepListOpen(!stepListOpen)}
            aria-label={t("stepList")}
            aria-pressed={stepListOpen}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
              stepListOpen
                ? "bg-primary/10 text-primary"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <List className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setIsNavigating(false)}
            className="shrink-0 flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full px-4 h-10 text-sm font-semibold transition-colors"
          >
            <Square className="h-3.5 w-3.5" />
            {t("end")}
          </button>
        </div>
      </div>
    </>
  );
}
