"use client";

import { LocateFixed, Share2, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import SosDialog from "@/components/Sos/SosDialog";
import ShareTargets from "@/components/shared/ShareTargets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";

const SOS_HOLD_MS = 3000;

/**
 * Share / emergency-report controls (per the reference mockup):
 * a share FAB opening a plain "share my location" dialog, plus an SOS
 * hold-to-trigger button that opens the fully separate SosDialog flow.
 * The two no longer share any UI — emergency mode was removed from the
 * plain share dialog per QA feedback.
 */
export default function ShareLocation() {
  const { t, i18n } = useAppTranslation();
  const { userLocation, isNavigating } = useMapStore();
  const [open, setOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  // --- SOS hold-to-trigger state ---
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

  // Reverse geocode the current position for the "位置：…" line.
  useEffect(() => {
    if (!open || !userLocation) return;
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
  }, [open, userLocation, i18n.language]);

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
    setOpen(true);
  }, [userLocation, t]);

  return (
    <>
      {/* Right-edge action stack. Mid-navigation the share FAB gives way to
          the HUD's voice + recenter controls; SOS stays reachable. */}
      {/* Mobile sits above the half-open bottom sheet; desktop centers on the map. */}
      <div className="absolute right-3 top-[38%] -translate-y-1/2 lg:top-auto lg:bottom-3 lg:translate-y-0 z-30 flex flex-col items-center gap-2 pointer-events-auto">
        {isNavigating ? (
          <NavSideControls />
        ) : (
          <button
            type="button"
            onClick={openShare}
            aria-label={t("shareLocation")}
            className="h-11 w-11 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-muted hover:shadow-xl transition-all flex flex-col items-center justify-center text-primary"
          >
            <Share2 className="h-5 w-5" />
          </button>
        )}
        <motion.button
          type="button"
          aria-label={`SOS ${t("sosHold")}`}
          onPointerDown={startHold}
          onPointerUp={clearHold}
          onPointerLeave={clearHold}
          onPointerCancel={clearHold}
          onContextMenu={(e) => e.preventDefault()}
          animate={holdRemaining != null ? { scale: 1.15 } : { scale: 1 }}
          className="h-14 w-14 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 hover:shadow-xl transition-colors flex flex-col items-center justify-center select-none touch-none"
        >
          <AnimatePresence mode="wait" initial={false}>
            {holdRemaining != null ? (
              <motion.span
                key="count"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-black tabular-nums"
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
                <span className="text-sm font-black">SOS</span>
                <span className="text-[8px] font-medium mt-0.5 opacity-90">
                  {t("sosHold")}
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Share dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
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

      <SosDialog open={sosOpen} onOpenChange={setSosOpen} />
    </>
  );
}

// Voice + recenter shortcuts shown in place of the share FAB while navigating.
function NavSideControls() {
  const { t } = useAppTranslation();
  const voiceEnabled = useNavStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useNavStore((s) => s.setVoiceEnabled);
  const setFollowPaused = useNavStore((s) => s.setFollowPaused);

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    toast.success(next ? t("voiceNavOn") : t("voiceNavOff"));
  };

  const recenter = () => {
    setFollowPaused(false);
    const { map, userLocation: loc, is3D } = useMapStore.getState();
    if (map && loc) {
      map.easeTo({
        center: [loc.lng, loc.lat],
        zoom: 18,
        pitch: is3D ? 60 : 0,
        duration: 500,
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleVoice}
        aria-label={t("voiceNav")}
        aria-pressed={voiceEnabled}
        className={`h-11 w-11 rounded-full backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all flex items-center justify-center ${
          voiceEnabled
            ? "bg-primary text-primary-foreground border-primary/50"
            : "bg-background/90 text-muted-foreground border-border/50 hover:bg-muted"
        }`}
      >
        {voiceEnabled ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </button>
      <button
        type="button"
        onClick={recenter}
        aria-label={t("recenter")}
        className="h-11 w-11 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-muted hover:shadow-xl transition-all flex items-center justify-center text-foreground"
      >
        <LocateFixed className="h-5 w-5" />
      </button>
    </>
  );
}
