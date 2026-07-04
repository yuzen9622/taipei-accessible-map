"use client";

import { Copy, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";

const SOS_HOLD_MS = 3000;

/**
 * Share / emergency-report controls (per the reference mockup):
 * a share FAB + an SOS hold-to-trigger button on the map's right edge,
 * opening a "share my location" dialog with LINE / WhatsApp / copy-link
 * targets and an optional emergency mode.
 *
 * NOTE: sending to saved emergency contacts requires backend support
 * (contact storage + server-side dispatch); until then emergency mode
 * only switches the share message to an SOS text.
 */
export default function ShareLocation() {
  const { t, i18n } = useAppTranslation();
  const { userLocation, isNavigating } = useMapStore();
  const [open, setOpen] = useState(false);
  const [emergency, setEmergency] = useState(false);
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
        setEmergency(true);
        setOpen(true);
        toast.warning(t("sosTriggered"));
      } else {
        setHoldRemaining(Math.ceil(left / 1000));
      }
    }, 100);
  }, [clearHold, t]);

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

  const shareText = emergency
    ? t("sosShareText", { address: address ?? t("myLocation") })
    : t("shareText", { address: address ?? t("myLocation") });

  const fullMessage = `${shareText} ${shareUrl}`;

  const handleLine = useCallback(() => {
    window.open(
      `https://line.me/R/share?text=${encodeURIComponent(fullMessage)}`,
      "_blank",
      "noopener",
    );
  }, [fullMessage]);

  const handleWhatsApp = useCallback(() => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(fullMessage)}`,
      "_blank",
      "noopener",
    );
  }, [fullMessage]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullMessage);
      toast.success(t("linkCopied"));
    } catch {
      // Clipboard API needs focus + secure context; fall back to execCommand
      // for in-app browsers (e.g. LINE) and older engines.
      const textarea = document.createElement("textarea");
      textarea.value = fullMessage;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (copied) toast.success(t("linkCopied"));
      else toast.error(t("copyFailed"));
    }
  }, [fullMessage, t]);

  const openShare = useCallback(() => {
    if (!userLocation) {
      toast.error(t("noLocation"));
      return;
    }
    setEmergency(false);
    setOpen(true);
  }, [userLocation, t]);

  if (isNavigating) return null;

  return (
    <>
      {/* Right-edge action stack */}
      {/* Mobile sits above the half-open bottom sheet; desktop centers on the map. */}
      <div className="absolute right-3 top-[38%] lg:top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={openShare}
          aria-label={t("shareLocation")}
          className="h-11 w-11 rounded-full bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-muted hover:shadow-xl transition-all flex flex-col items-center justify-center text-primary"
        >
          <Share2 className="h-5 w-5" />
        </button>
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

          <div className="grid grid-cols-3 gap-3 mt-2">
            <button
              type="button"
              onClick={handleLine}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 hover:bg-muted/60 hover:shadow-sm transition-all"
            >
              <Image src="/line-icon.svg" alt="LINE" width={28} height={28} />
              <span className="text-sm font-semibold">{t("shareToLine")}</span>
              <span className="text-[11px] text-muted-foreground">
                {t("shareToLineDesc")}
              </span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 hover:bg-muted/60 hover:shadow-sm transition-all"
            >
              <Image
                src="/whatsapp-icon.svg"
                alt="WhatsApp"
                width={28}
                height={28}
              />
              <span className="text-sm font-semibold">
                {t("shareToWhatsApp")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {t("shareToWhatsAppDesc")}
              </span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 hover:bg-muted/60 hover:shadow-sm transition-all"
            >
              <span className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Copy className="h-4 w-4 text-primary" />
              </span>
              <span className="text-sm font-semibold">{t("copyLink")}</span>
              <span className="text-[11px] text-muted-foreground">
                {t("copyLinkDesc")}
              </span>
            </button>
          </div>

          {/* Emergency mode */}
          <div className="flex items-center gap-3 mt-2 pt-4 border-t border-border/40">
            <span className="h-8 w-8 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
              SOS
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{t("sosOptional")}</p>
              <p className="text-xs text-muted-foreground">
                {t("sosOptionalDesc")}
              </p>
            </div>
            <Switch
              checked={emergency}
              onCheckedChange={setEmergency}
              aria-label={t("sosOptional")}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
