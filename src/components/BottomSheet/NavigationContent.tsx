"use client";

import {
  ChevronLeft,
  ChevronRight,
  Footprints,
  Navigation,
  Square,
  TramFront,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppTranslation } from "@/i18n/client";
import { getRouteInstructions } from "@/lib/api/a11y";
import useMapStore from "@/stores/useMapStore";
import type { NavInstruction } from "@/types/route";
import { formatDistance, formatDuration, getLegColor } from "@/types/route";
import { Button } from "../ui/button";

export default function NavigationContent() {
  const { t, i18n } = useAppTranslation();
  const { selectRoute, setIsNavigating } = useMapStore();

  const route = selectRoute?.route;
  const currentLeg = route?.legs[0];

  const [instructions, setInstructions] = useState<NavInstruction[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    if (!route) return;
    getRouteInstructions({
      route: { routeId: route.routeId, legs: route.legs },
      language: i18n.language === "en" ? "en" : "zh-TW",
    }).then((res) => {
      if (res.ok && res.data?.instructions) {
        setInstructions(res.data.instructions);
        setCurrentStep(0);
      }
    }).catch(() => {});
  }, [route, i18n.language]);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !synthRef.current) return;
      synthRef.current.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = i18n.language === "zh-TW" ? "zh-TW" : "en-US";
      utter.rate = 0.9;
      synthRef.current.speak(utter);
    },
    [voiceEnabled, i18n.language]
  );

  useEffect(() => {
    if (instructions[currentStep]) {
      speak(instructions[currentStep].text);
    }
  }, [currentStep, instructions, speak]);

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    toast.success(next ? t("voiceNavOn") : t("voiceNavOff"));
    if (!next && synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const step = instructions[currentStep];

  return (
    <div className="space-y-3">
      {/* Voice toggle + step counter */}
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
          {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {t("voiceNav")}
        </button>
        {instructions.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("stepOf", { current: currentStep + 1, total: instructions.length })}
          </span>
        )}
      </div>

      {/* Current instruction */}
      {step ? (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: getLegColor(route?.legs[0] ?? { type: "WALK" } as never) + "20" }}
            >
              {step.legType === "WALK" ? (
                <Footprints className="h-5 w-5 text-blue-500" />
              ) : (
                <TramFront className="h-5 w-5 text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">{step.text}</p>
              <div className="flex items-center gap-2 mt-1">
                {step.distanceM != null && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistance(step.distanceM)}
                  </span>
                )}
                {step.streetName && (
                  <span className="text-xs text-muted-foreground">
                    · {step.streetName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : currentLeg ? (
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
                ? `${t("walk")} ${formatDistance(currentLeg.distanceM)}`
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
      ) : null}

      {/* Step navigation */}
      {instructions.length > 1 && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            className="flex-1 rounded-xl gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("prevStep")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep >= instructions.length - 1}
            onClick={() => setCurrentStep((s) => Math.min(instructions.length - 1, s + 1))}
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
