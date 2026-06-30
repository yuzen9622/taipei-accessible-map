"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Footprints,
  LocateFixed,
  Navigation,
  RefreshCw,
  Square,
  TramFront,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useComputeRoute from "@/hook/useComputeRoute";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";
import { formatDistance, formatDuration, getLegColor } from "@/types/route";
import { Button } from "../ui/button";

const NAV_ZOOM = 20;
const NAV_PITCH = 60;

export default function NavigationContent() {
  const { t, i18n } = useAppTranslation();
  const { selectRoute, setIsNavigating, destination } = useMapStore();
  const { handleComputeRoute, isLoading } = useComputeRoute();

  // Runtime nav state lives in useNavStore (written by the engine). Subscribe
  // with selectors so this panel only re-renders on the slices it shows.
  const instructions = useNavStore((s) => s.instructions);
  const currentStep = useNavStore((s) => s.currentStepIndex);
  const distanceToNextM = useNavStore((s) => s.distanceToNextM);
  const isOffRoute = useNavStore((s) => s.isOffRoute);
  const arrived = useNavStore((s) => s.arrived);
  const setStepIndex = useNavStore((s) => s.setStepIndex);

  const route = selectRoute?.route;
  const currentLeg = route?.legs[0];

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !synthRef.current) return;
      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = i18n.language === "zh-TW" ? "zh-TW" : "en-US";
      utter.rate = 0.9;
      synthRef.current.speak(utter);
    },
    [voiceEnabled, i18n.language],
  );

  // Announce whenever the active step changes (auto-advance or manual).
  useEffect(() => {
    const step = instructions[currentStep];
    if (step) speak(step.text);
  }, [currentStep, instructions, speak]);

  // Announce arrival once.
  useEffect(() => {
    if (arrived) speak(t("arrivedDesc"));
  }, [arrived, speak, t]);

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    toast.success(next ? t("voiceNavOn") : t("voiceNavOff"));
    if (!next && synthRef.current) synthRef.current.cancel();
  };

  const handleRecenter = () => {
    const map = useMapStore.getState().map;
    const loc = useMapStore.getState().userLocation;
    if (map && loc) {
      map.easeTo({
        center: [loc.lng, loc.lat],
        zoom: NAV_ZOOM,
        pitch: NAV_PITCH,
        duration: 500,
      });
    }
  };

  const handleRecalculate = () => {
    if (!destination) {
      toast.error(t("recalculateFailed"));
      return;
    }
    // Omit origin → useComputeRoute uses the current GPS location as the start.
    // A new routeId makes the engine reload instructions and resume navigating.
    handleComputeRoute({ destination: destination.position });
  };

  const step = instructions[currentStep];

  // --- Arrived ---
  if (arrived) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="text-base font-semibold">{t("arrived")}</p>
          <p className="text-sm text-muted-foreground text-center">
            {t("arrivedDesc")}
          </p>
        </div>
        <Button
          onClick={() => setIsNavigating(false)}
          className="w-full rounded-xl h-11 gap-2"
        >
          <Square className="h-4 w-4" />
          {t("endNav")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Voice toggle + step counter + recenter */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={toggleVoice}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            voiceEnabled
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground"
          }`}
        >
          {voiceEnabled ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
          {t("voiceNav")}
        </button>
        <div className="flex items-center gap-2">
          {instructions.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {t("stepOf", {
                current: currentStep + 1,
                total: instructions.length,
              })}
            </span>
          )}
          <button
            type="button"
            onClick={handleRecenter}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground hover:bg-muted transition-colors"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {t("recenter")}
          </button>
        </div>
      </div>

      {/* Off-route banner */}
      {isOffRoute && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {t("offRoute")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={handleRecalculate}
            className="rounded-xl gap-1 shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            {t("recalculate")}
          </Button>
        </div>
      )}

      {/* Current instruction */}
      {step ? (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{
                backgroundColor: `${getLegColor(route?.legs[0] ?? ({ type: "WALK" } as never))}20`,
              }}
            >
              {step.legType === "WALK" ? (
                <Footprints className="h-5 w-5 text-blue-500" />
              ) : (
                <TramFront className="h-5 w-5 text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {/* Live remaining distance to this maneuver */}
              {distanceToNextM != null && (
                <p className="text-2xl font-bold leading-none mb-1">
                  {formatDistance(distanceToNextM)}
                </p>
              )}
              <p className="text-sm font-semibold leading-snug">{step.text}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {step.relativeDirection && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {step.relativeDirection}
                  </span>
                )}
                {step.streetName && (
                  <span className="text-xs text-muted-foreground">
                    {step.streetName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : currentLeg ? (
        // Fallback while instructions are still loading.
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${getLegColor(currentLeg)}20` }}
          >
            {currentLeg.type === "WALK" ? (
              <Footprints
                className="h-5 w-5"
                style={{ color: getLegColor(currentLeg) }}
              />
            ) : (
              <TramFront
                className="h-5 w-5"
                style={{ color: getLegColor(currentLeg) }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t("preparingNav")}</p>
            <p className="text-xs text-muted-foreground">
              {route ? formatDuration(route.totalMinutes) : ""}
            </p>
          </div>
          <Navigation className="h-5 w-5 text-primary shrink-0" />
        </div>
      ) : null}

      {/* Manual step override */}
      {instructions.length > 1 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep === 0}
            onClick={() => setStepIndex(Math.max(0, currentStep - 1))}
            className="flex-1 rounded-xl gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("prevStep")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep >= instructions.length - 1}
            onClick={() =>
              setStepIndex(Math.min(instructions.length - 1, currentStep + 1))
            }
            className="flex-1 rounded-xl gap-1"
          >
            {t("nextStep")}
            <ChevronRight className="h-4 w-4" />
          </Button>
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
