"use client";

import {
  AlertTriangle,
  Check,
  HelpCircle,
  MapPin,
  PhoneCall,
  Share2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ShareTargets from "@/components/shared/ShareTargets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";

const SOS_COUNTDOWN_MS = 5000;

type SosType = "body" | "trapped" | "share_location";
type SosStep = "select-type" | "countdown" | "active" | "resolved";

const SOS_TYPES: { key: SosType; icon: typeof AlertTriangle }[] = [
  { key: "body", icon: AlertTriangle },
  { key: "trapped", icon: HelpCircle },
  { key: "share_location", icon: MapPin },
];

const SOS_TYPE_LABEL_KEY: Record<SosType, string> = {
  body: "sosBodyDiscomfort",
  trapped: "sosTrapped",
  share_location: "sosShareLocationType",
};

/**
 * Dedicated SOS flow (select type -> 5s cancelable countdown -> active
 * sharing -> user-resolved), independent from the plain share dialog.
 * Backend emergency-contacts/session APIs are not built yet (deferred pass),
 * so the "active" screen's contact list is a static placeholder and manual
 * LINE/WhatsApp/copy-link stays the only working dispatch path.
 */
export default function SosDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useAppTranslation();
  const userLocation = useMapStore((s) => s.userLocation);
  const [step, setStep] = useState<SosStep>("select-type");
  const [selectedType, setSelectedType] = useState<SosType | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SOS_COUNTDOWN_MS / 1000);
  const [address, setAddress] = useState<string | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetAndClose = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    countdownTimer.current = null;
    setStep("select-type");
    setSelectedType(null);
    onOpenChange(false);
  };

  const handleSelectType = (type: SosType) => {
    setSelectedType(type);
    setStep("countdown");
    const startedAt = Date.now();
    setSecondsLeft(SOS_COUNTDOWN_MS / 1000);
    countdownTimer.current = setInterval(() => {
      const left = SOS_COUNTDOWN_MS - (Date.now() - startedAt);
      if (left <= 0) {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        setStep("active");
      } else {
        setSecondsLeft(Math.ceil(left / 1000));
      }
    }, 100);
  };

  const handleCancelCountdown = () => {
    resetAndClose();
  };

  useEffect(
    () => () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    },
    [],
  );

  // Reverse geocode the current position for the "active" screen's location line.
  useEffect(() => {
    if (step !== "active" || !userLocation) return;
    const controller = new AbortController();
    const lang = i18n.language === "zh-TW" ? "zh-TW" : "en";
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}&accept-language=${lang}&zoom=16&addressdetails=1`,
      { signal: controller.signal },
    )
      .then((res) => res.json())
      .then((data) => setAddress(data?.display_name ?? null))
      .catch(() => {});
    return () => controller.abort();
  }, [step, userLocation, i18n.language]);

  const shareUrl = userLocation
    ? `${window.location.origin}/${i18n.language}?loc=${userLocation.lat.toFixed(6)},${userLocation.lng.toFixed(6)}`
    : "";
  const sosMessage = `${t("sosShareText", { address: address ?? t("myLocation") })} ${shareUrl}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetAndClose();
      }}
    >
      <DialogContent className="max-w-md rounded-2xl p-6">
        {step === "select-type" && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-left">
                {t("sosSelectTitle")}
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-left">
                {t("sosSelectDesc")}
              </p>
            </DialogHeader>
            <div className="space-y-2">
              {SOS_TYPES.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectType(key)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border/60 hover:bg-muted/60 hover:shadow-sm transition-all text-left"
                >
                  <span className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-red-600" />
                  </span>
                  <span className="text-sm font-semibold">
                    {t(SOS_TYPE_LABEL_KEY[key])}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "countdown" && selectedType && (
          <div className="space-y-5 flex flex-col items-center py-2">
            <DialogHeader className="w-full">
              <DialogTitle className="text-lg font-bold text-center text-red-600">
                {t("sosCountdownTitle")}
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-center">
                {t(SOS_TYPE_LABEL_KEY[selectedType])}
              </p>
            </DialogHeader>
            <div className="h-24 w-24 rounded-full border-4 border-red-500 flex items-center justify-center">
              <span className="text-4xl font-black tabular-nums text-red-600">
                {secondsLeft}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("sosCountdownDesc")}
            </p>
            <Button
              variant="secondary"
              onClick={handleCancelCountdown}
              className="w-full rounded-xl h-11"
            >
              {t("sosCountdownCancel")}
            </Button>
          </div>
        )}

        {step === "active" && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-left text-red-600 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {t("sosActiveTitle")}
              </DialogTitle>
            </DialogHeader>

            <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t("sosNotifiedContacts")}
              </p>
              <p className="text-sm">{t("sosNoContacts")}</p>
            </div>

            <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {t("sosCurrentLocation")}
              </p>
              <p className="text-sm">{address ?? t("locating")}</p>
              <p className="text-xs text-muted-foreground">
                {t("sosContinuousSharing")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                asChild
                variant="destructive"
                className="w-full rounded-xl h-11 gap-1.5"
              >
                <a href="tel:110">
                  <PhoneCall className="h-4 w-4" />
                  {t("sosCall110")}
                </a>
              </Button>
              <Button
                asChild
                variant="destructive"
                className="w-full rounded-xl h-11 gap-1.5"
              >
                <a href="tel:119">
                  <PhoneCall className="h-4 w-4" />
                  {t("sosCall119")}
                </a>
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5" />
                {t("sosManualShareLabel")}
              </p>
              <ShareTargets message={sosMessage} />
            </div>

            <Button
              variant="outline"
              onClick={() => setStep("resolved")}
              className="w-full rounded-xl h-11"
            >
              {t("sosResolveButton")}
            </Button>
          </div>
        )}

        {step === "resolved" && (
          <div className="space-y-4 flex flex-col items-center py-2 text-center">
            <span className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </span>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-center">
                {t("sosResolvedTitle")}
              </DialogTitle>
              <p className="text-sm text-muted-foreground text-center">
                {t("sosResolvedDesc")}
              </p>
            </DialogHeader>
            <Button
              onClick={resetAndClose}
              className="w-full rounded-xl h-11 gap-1.5"
            >
              <X className="h-4 w-4" />
              {t("sosClose")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
