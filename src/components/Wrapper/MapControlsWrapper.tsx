"use client";

import {
  BotMessageSquare,
  CloudRain,
  Leaf,
  Loader2,
  LocateFixed,
  Navigation,
  Plus,
  RefreshCw,
  Share2,
  Thermometer,
  Volume2,
  VolumeX,
  Wind,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import SosDialog from "@/components/Sos/SosDialog";
import ShareTargets from "@/components/shared/ShareTargets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useIsDesktop from "@/hook/useIsDesktop";
import usePin from "@/hook/usePin";
import { useAppTranslation } from "@/i18n/client";
import { getEnvironmentInfo } from "@/lib/api/a11y";
import { cn } from "@/lib/utils";
import useMapStore, { type SheetMode } from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";
import type { AirQualityLevel, EnvironmentData } from "@/types/route";

const SOS_HOLD_MS = 3000;

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

const getBottomOffset = (sheetMode: SheetMode, isNavigating: boolean) => {
  if (isNavigating) return "bottom-[14dvh]";
  switch (sheetMode) {
    case "navigation":
      return "bottom-[14dvh]";
    case "home":
    case "place":
    case "plan":
    case "route":
    case "a11y":
    case "station":
      return "bottom-[47dvh]";
    default:
      return "bottom-[14dvh]";
  }
};

export default function MapControlsWrapper() {
  const { t, i18n } = useAppTranslation();
  const { handlePinClick } = usePin();
  const {
    userLocation,
    sidebarCollapsed,
    activeRailPanel,
    is3D,
    setIs3D,
    isNavigating,
    sheetMode,
    chatOpen,
    setChatOpen,
  } = useMapStore();

  const panelOpen = activeRailPanel !== "none";
  const isDesktop = useIsDesktop();
  const [moreControlsOpen, setMoreControlsOpen] = useState(false);
  const moreToggleRef = useRef<HTMLButtonElement>(null);

  // --- Environment widget state ---
  const [envData, setEnvData] = useState<EnvironmentData | null>(null);
  const [envLoading, setEnvLoading] = useState(false);
  const [envExpanded, setEnvExpanded] = useState(false);
  const hasEnvFetchedRef = useRef(false);

  const fetchEnvironment = useCallback(async () => {
    const loc = useMapStore.getState().userLocation;
    if (!loc) return;
    setEnvLoading(true);
    try {
      const res = await getEnvironmentInfo(loc.lat, loc.lng);
      if (res.ok && res.data) {
        setEnvData(res.data);
      }
    } catch {
      // silently fail
    } finally {
      setEnvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasEnvFetchedRef.current || !userLocation || isNavigating) return;
    hasEnvFetchedRef.current = true;
    fetchEnvironment();
  }, [userLocation, isNavigating, fetchEnvironment]);

  // --- Share dialog state ---
  const [shareOpen, setShareOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [holdRemaining, setHoldRemaining] = useState<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    setHoldRemaining(null);
  }, []);

  const startHold = useCallback(() => {
    const startedAt = Date.now();
    setHoldRemaining(SOS_HOLD_MS / 1000);
    holdTimer.current = setInterval(() => {
      const left = SOS_HOLD_MS - (Date.now() - startedAt);
      if (left <= 0) {
        clearHold();
        setSosOpen(true);
      } else {
        setHoldRemaining(Math.ceil(left / 1000));
      }
    }, 100);
  }, [clearHold]);

  useEffect(() => clearHold, [clearHold]);

  // Reverse geocode user location for sharing
  useEffect(() => {
    if (!shareOpen || !userLocation) return;
    const controller = new AbortController();
    const lang = i18n.language === "zh-TW" ? "zh-TW" : "en";
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}&accept-language=${lang}&zoom=16&addressdetails=1`,
      { signal: controller.signal },
    )
      .then((res) => res.json())
      .then((data) => {
        const a = data?.address;
        if (!a) return;
        const composed = [
          a.city || a.county || "",
          a.suburb || a.city_district || a.town || "",
          a.road || a.neighbourhood || "",
        ]
          .filter(Boolean)
          .join(i18n.language === "zh-TW" ? "" : ", ");
        setAddress(
          composed
            ? i18n.language === "zh-TW"
              ? `${composed}附近`
              : `near ${composed}`
            : data.display_name,
        );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [shareOpen, userLocation, i18n.language]);

  const shareUrl = userLocation
    ? `${window.location.origin}/${i18n.language}?loc=${userLocation.lat.toFixed(6)},${userLocation.lng.toFixed(6)}`
    : "";
  const shareText = t("shareText", { address: address ?? t("myLocation") });
  const fullMessage = `${shareText} ${shareUrl}`;

  const openShare = useCallback(() => {
    if (!userLocation) {
      toast.error(t("noLocation"));
      return;
    }
    setShareOpen(true);
  }, [userLocation, t]);

  // --- Voice / Recenter Navigation mode controls ---
  const voiceEnabled = useNavStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useNavStore((s) => s.setVoiceEnabled);
  const setFollowPaused = useNavStore((s) => s.setFollowPaused);

  const toggleVoice = useCallback(() => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    toast.success(next ? t("voiceNavOn") : t("voiceNavOff"));
  }, [voiceEnabled, setVoiceEnabled, t]);

  const recenterNav = useCallback(() => {
    setFollowPaused(false);
    const {
      map: currentMap,
      userLocation: loc,
      is3D: currentIs3D,
    } = useMapStore.getState();
    if (currentMap && loc) {
      currentMap.easeTo({
        center: [loc.lng, loc.lat],
        zoom: 18,
        pitch: currentIs3D ? 60 : 0,
        duration: 500,
      });
    }
  }, [setFollowPaused]);

  // --- Environment Data parsing ---
  const air = envData?.airQuality.status === "ok" ? envData.airQuality : null;
  const weather = envData?.weather.status === "ok" ? envData.weather : null;
  const showAirPill =
    !isNavigating &&
    (envLoading || air || (weather && weather.temperature != null));

  const envConfig = LEVEL_CONFIG[normalizeQuality(air?.quality)];
  const envLabel = i18n.language === "en" ? envConfig.labelEn : envConfig.label;
  const pillConfig = air ? envConfig : LEVEL_CONFIG[""];

  return (
    <>
      <div className="fixed inset-0 pointer-events-none z-30">
        {/* 1. Top-Right Container: Environment Info Badge */}
        {showAirPill && (
          <div className="absolute top-24 right-3 pointer-events-auto z-30 flex flex-col items-end">
            <motion.button
              layout
              onClick={() => setEnvExpanded(!envExpanded)}
              className="bg-background/95 backdrop-blur-md rounded-full shadow-lg border border-border/50 px-3 py-2 flex items-center gap-2 cursor-pointer select-none transition-colors hover:shadow-xl h-11"
              whileTap={{ scale: 0.96 }}
              aria-label={t("airQuality", "空氣品質")}
              aria-expanded={envExpanded}
            >
              {envLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : air ? (
                <Leaf className={`h-4 w-4 ${pillConfig.color}`} />
              ) : (
                <CloudRain className="h-4 w-4 text-sky-500" />
              )}
              {(envLoading || air) && (
                <span className={`text-xs font-semibold ${pillConfig.color}`}>
                  {envLoading ? "..." : envLabel}
                </span>
              )}
              {!envLoading && weather?.temperature != null && (
                <>
                  {air && <span className="w-px h-4 bg-border" />}
                  <span className="text-xs font-semibold text-foreground">
                    {weather.temperature}°C
                  </span>
                </>
              )}
              {envExpanded && (
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </motion.button>

            <AnimatePresence>
              {envExpanded && envData && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-12 bg-background/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 p-3.5 space-y-3 w-[168px] z-50"
                >
                  <div className="flex items-center justify-end -mt-1 -mr-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchEnvironment();
                      }}
                      disabled={envLoading}
                      className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label={t("refresh", "重新整理")}
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${envLoading ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>
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
                      value={envLabel}
                      valueClass={envConfig.color}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 2. Bottom-Left Container: 3D/2D, Locate, AI Assistant vertical stack (Desktop Only) */}
        {!isNavigating && (
          <div
            className={cn(
              "absolute bottom-5 pointer-events-auto hidden lg:flex flex-col gap-2 z-30",
              !sidebarCollapsed && panelOpen ? "left-[468px]" : "left-[76px]",
            )}
            style={{ transition: "left 0.3s ease" }}
            aria-hidden={!isDesktop}
            inert={!isDesktop}
          >
            {/* 3D/2D Toggle */}
            <Button
              aria-label={is3D ? "切換為 2D 視角" : "切換為 3D 視角"}
              aria-pressed={is3D}
              variant="secondary"
              size="icon"
              onClick={() => setIs3D(!is3D)}
              className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all text-xs font-bold text-foreground"
            >
              {is3D ? "2D" : "3D"}
            </Button>

            {/* Recenter (My Location) Button */}
            <Button
              aria-label="回到目前位置"
              variant="secondary"
              size="icon"
              onClick={() => handlePinClick(userLocation)}
              className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all"
            >
              <Navigation className="h-5 w-5 text-foreground" />
            </Button>

            {/* AI ChatBot FAB */}
            {!chatOpen && (
              <Button
                onClick={() => setChatOpen(true)}
                variant="default"
                size="icon"
                className="rounded-full h-11 w-11 shadow-lg bg-primary hover:shadow-xl transition-all text-primary-foreground"
                aria-label={t("chatbot.open", "開啟聊天助理")}
              >
                <BotMessageSquare className="h-6 w-6" />
              </Button>
            )}
          </div>
        )}

        {/* 3. Bottom-Right Container: SOS & Share (Desktop side-by-side; Mobile full stack above bottomsheet) */}
        <div
          className={cn(
            "absolute right-3 pointer-events-auto flex flex-col gap-2 items-end z-30",
            getBottomOffset(sheetMode, isNavigating),
            "lg:bottom-8 lg:flex-row lg:items-center",
          )}
          style={{ transition: "bottom 0.3s ease" }}
        >
          {isNavigating ? (
            // Navigation Mode Controls
            <div className="flex flex-col lg:flex-row gap-2">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={toggleVoice}
                aria-label={t("voiceNav")}
                aria-pressed={voiceEnabled}
                className={cn(
                  "rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:shadow-xl transition-all",
                  voiceEnabled
                    ? "bg-primary text-primary-foreground border-primary/50"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {voiceEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={recenterNav}
                aria-label={t("recenter")}
                className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all text-foreground"
              >
                <LocateFixed className="h-5 w-5" />
              </Button>
              {/* SOS hold button during navigation */}
              <motion.button
                type="button"
                aria-label={`SOS ${t("sosHold")}`}
                onPointerDown={startHold}
                onPointerUp={clearHold}
                onPointerLeave={clearHold}
                onPointerCancel={clearHold}
                onContextMenu={(e) => e.preventDefault()}
                animate={holdRemaining != null ? { scale: 1.15 } : { scale: 1 }}
                className="h-11 w-11 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 hover:shadow-xl transition-colors flex flex-col items-center justify-center select-none touch-none shrink-0"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {holdRemaining != null ? (
                    <motion.span
                      key="count"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-black tabular-nums"
                    >
                      {holdRemaining}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center leading-none"
                    >
                      <span className="text-xs font-black">SOS</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          ) : (
            // Standard Map Mode Controls
            <>
              {/* On Mobile: only Locate stays always visible next to SOS; Chat,
                  3D and Share collapse behind a "more" toggle so the right
                  edge never stacks more than 3 icons tall at once.
                  flex-col-reverse keeps the visual stack (expanded group on
                  top) while the DOM/tab order follows the disclosure pattern:
                  recenter → toggle → expanded content. */}
              <div
                className="flex flex-col-reverse lg:hidden gap-2 items-end"
                aria-hidden={isDesktop}
                inert={isDesktop}
              >
                {/* Recenter Button (Mobile, always visible) */}
                <Button
                  aria-label={t("recenter")}
                  variant="secondary"
                  size="icon"
                  onClick={() => handlePinClick(userLocation)}
                  className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all"
                >
                  <Navigation className="h-5 w-5 text-foreground" />
                </Button>

                {/* More controls toggle (Mobile) */}
                <Button
                  ref={moreToggleRef}
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => setMoreControlsOpen((v) => !v)}
                  aria-label={t("moreControls", "更多控制項")}
                  aria-expanded={moreControlsOpen}
                  aria-controls="mobile-more-controls"
                  className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all text-foreground"
                >
                  <motion.span
                    animate={{ rotate: moreControlsOpen ? 135 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex"
                  >
                    <Plus className="h-5 w-5" />
                  </motion.span>
                </Button>

                {moreControlsOpen && (
                  <div
                    id="mobile-more-controls"
                    className="flex flex-col-reverse gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
                  >
                    {/* AI ChatBot FAB (Mobile) */}
                    {!chatOpen && (
                      <Button
                        onClick={() => {
                          // Park focus on the toggle before the panel swaps in,
                          // so keyboard focus never sits inside unmounted DOM.
                          moreToggleRef.current?.focus();
                          setChatOpen(true);
                          setMoreControlsOpen(false);
                        }}
                        variant="default"
                        size="icon"
                        className="rounded-full h-11 w-11 shadow-lg bg-primary hover:shadow-xl transition-all text-primary-foreground"
                        aria-label={t("chatbot.open", "開啟聊天助理")}
                      >
                        <BotMessageSquare className="h-6 w-6" />
                      </Button>
                    )}

                    {/* 3D/2D Toggle (Mobile) */}
                    <Button
                      aria-label={is3D ? t("switchTo2D") : t("switchTo3D")}
                      aria-pressed={is3D}
                      variant="secondary"
                      size="icon"
                      onClick={() => setIs3D(!is3D)}
                      className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all text-xs font-bold text-foreground"
                    >
                      {is3D ? "2D" : "3D"}
                    </Button>

                    {/* Share Location Button (Mobile) */}
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        if (!userLocation) {
                          // openShare only toasts in this case — keep the
                          // group open so the user can retry without
                          // re-expanding.
                          openShare();
                          return;
                        }
                        // Focus the toggle first so the share dialog records
                        // it as the previously-focused element and restores
                        // focus there on close (this button unmounts).
                        moreToggleRef.current?.focus();
                        openShare();
                        setMoreControlsOpen(false);
                      }}
                      aria-label={t("shareLocation")}
                      className="rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all text-primary"
                    >
                      <Share2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Share & SOS Group (Desktop side-by-side; mobile only shows SOS,
                  Share moved into the collapsible group above) */}
              <div className="flex flex-col lg:flex-row gap-2">
                {/* Share Location Button (Desktop only) */}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={openShare}
                  aria-label={t("shareLocation")}
                  aria-hidden={!isDesktop}
                  inert={!isDesktop}
                  className="hidden lg:inline-flex rounded-full h-11 w-11 shadow-lg bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted hover:shadow-xl transition-all text-primary"
                >
                  <Share2 className="h-5 w-5" />
                </Button>

                {/* SOS Hold-to-Trigger Button */}
                <motion.button
                  type="button"
                  aria-label={`SOS ${t("sosHold")}`}
                  onPointerDown={startHold}
                  onPointerUp={clearHold}
                  onPointerLeave={clearHold}
                  onPointerCancel={clearHold}
                  onContextMenu={(e) => e.preventDefault()}
                  animate={
                    holdRemaining != null ? { scale: 1.15 } : { scale: 1 }
                  }
                  className="h-11 w-11 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 hover:shadow-xl transition-colors flex flex-col items-center justify-center select-none touch-none shrink-0"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {holdRemaining != null ? (
                      <motion.span
                        key="count"
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm font-black tabular-nums"
                      >
                        {holdRemaining}
                      </motion.span>
                    ) : (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center leading-none"
                      >
                        <span className="text-xs font-black">SOS</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 pointer-events-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-left">
              {t("shareLocationTitle")}
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-left">
              {t("shareLocationAt", {
                address: address ?? t("locating"),
              })}
            </p>
          </DialogHeader>

          <div className="mt-2">
            <ShareTargets message={fullMessage} />
          </div>
        </DialogContent>
      </Dialog>

      {/* SOS Dialog */}
      <SosDialog open={sosOpen} onOpenChange={setSosOpen} />
    </>
  );
}
