"use client";

import {
  AlertTriangle,
  Check,
  HelpCircle,
  Loader2,
  MapPin,
  PhoneCall,
  Share2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import EmergencyContactsDialog from "@/components/Sos/EmergencyContactsDialog";
import ShareTargets from "@/components/shared/ShareTargets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppTranslation } from "@/i18n/client";
import {
  createSosSession,
  getEmergencyContacts,
  resolveSosSession,
  updateSosLocation,
} from "@/lib/api/sos";
import { ApiError } from "@/lib/fetch";
import useMapStore from "@/stores/useMapStore";
import type { EmergencyContact } from "@/types/sos";

const SOS_COUNTDOWN_MS = 5000;
const LOCATION_UPDATE_MS = 12000;

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
  const [contactsDialogOpen, setContactsDialogOpen] = useState(false);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // SOS session lifecycle (backend-tracked, drives the "active" screen's
  // real contact list, location-update polling, and the shareable tracking
  // link — see src/lib/api/sos.ts).
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [notifiedCount, setNotifiedCount] = useState<number | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [boundContacts, setBoundContacts] = useState<EmergencyContact[]>([]);

  // Mirrors `open` for use inside async callbacks: lets startSosSession
  // detect "the dialog was closed while createSosSession was in flight" so
  // it can abandon-resolve the just-created session instead of adopting it.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const resetAndClose = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    countdownTimer.current = null;
    setStep("select-type");
    setSelectedType(null);
    setSessionId(null);
    setNotifiedCount(null);
    setBoundContacts([]);
    onOpenChange(false);
  };

  const startSosSession = async (type: SosType) => {
    if (!userLocation) {
      toast.error(t("noLocation"));
      setStep("select-type");
      return;
    }
    setCreatingSession(true);
    try {
      const response = await createSosSession({
        type,
        lat: userLocation.lat,
        lng: userLocation.lng,
        address: address ?? undefined,
      });
      if (!openRef.current) {
        // Dialog was closed while this request was in flight. The backend
        // session already exists and contacts were already notified —
        // resolve it immediately so they aren't left believing there's an
        // ongoing emergency the user actually cancelled. Use the id from
        // this response, not the (still-null) `sessionId` state.
        if (response.data) {
          resolveSosSession(response.data.sessionId).catch(() => {});
        }
        return;
      }
      if (response.data) {
        setSessionId(response.data.sessionId);
        setNotifiedCount(response.data.notifiedCount);
      }
    } catch (err) {
      if (openRef.current) {
        toast.error((err as Error).message);
        setStep("select-type");
        setSelectedType(null);
      }
    } finally {
      if (openRef.current) setCreatingSession(false);
    }
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
        startSosSession(type);
      } else {
        setSecondsLeft(Math.ceil(left / 1000));
      }
    }, 100);
  };

  const handleCancelCountdown = () => {
    resetAndClose();
  };

  const handleResolve = async () => {
    if (sessionId) {
      try {
        await resolveSosSession(sessionId);
      } catch {
        toast.error(t("sosResolveSyncFailed"));
      }
    }
    setStep("resolved");
  };

  useEffect(
    () => () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    },
    [],
  );

  // Fetch the already-bound contact list once on entering "active", purely
  // for display ("who was notified") — not polled, since this flow is
  // short-lived and only needs to reflect who was bound before this SOS.
  useEffect(() => {
    if (step !== "active") return;
    getEmergencyContacts()
      .then((res) => setBoundContacts(res.data?.contacts ?? []))
      .catch(() => {});
  }, [step]);

  // Location-update polling: a dedicated effect (not an imperative
  // interval) so its lifetime is tied directly to `open`/`step`/`sessionId`
  // — closing the dialog always tears this down, regardless of exactly when
  // `sessionId` got set relative to the close.
  useEffect(() => {
    if (!open || step !== "active" || !sessionId) return;
    let failCount = 0;
    const interval = setInterval(async () => {
      const loc = useMapStore.getState().userLocation;
      if (!loc) return;
      try {
        await updateSosLocation(sessionId, {
          lat: loc.lat,
          lng: loc.lng,
          address: address ?? undefined,
        });
        failCount = 0;
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.code === 400 &&
          err.reason === "SESSION_NOT_ACTIVE"
        ) {
          setStep("resolved");
          return;
        }
        failCount += 1;
        if (failCount === 1) toast.error(t("sosLocationSyncFailed"));
      }
    }, LOCATION_UPDATE_MS);
    return () => clearInterval(interval);
  }, [open, step, sessionId, address, t]);

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

  const shareUrl = sessionId
    ? `${window.location.origin}/${i18n.language}?sos=${sessionId}`
    : "";
  const sosMessage = `${t("sosShareText", { address: address ?? t("myLocation") })} ${shareUrl}`;
  const boundContactNames = boundContacts
    .filter((c) => c.bindStatus === "bound")
    .map((c) => c.name);

  return (
    <>
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
              <button
                type="button"
                onClick={() => setContactsDialogOpen(true)}
                className="w-full text-center text-sm text-primary underline"
              >
                {t("sosManageContactsLink")}
              </button>
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

          {step === "active" && creatingSession && !sessionId && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-red-600" />
              <DialogTitle className="text-lg font-bold text-red-600">
                {t("sosActiveTitle")}
              </DialogTitle>
            </div>
          )}

          {step === "active" && sessionId && (
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
                {notifiedCount &&
                notifiedCount > 0 &&
                boundContactNames.length > 0 ? (
                  <p className="text-sm">{boundContactNames.join("、")}</p>
                ) : (
                  <p className="text-sm">{t("sosNoContacts")}</p>
                )}
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
                onClick={handleResolve}
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

      <EmergencyContactsDialog
        open={contactsDialogOpen}
        onOpenChange={setContactsDialogOpen}
      />
    </>
  );
}
