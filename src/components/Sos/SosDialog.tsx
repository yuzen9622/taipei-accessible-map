"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  MapPin,
  PersonStanding,
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
import { useSosLifecycle } from "@/hook/useSosLifecycle";
import { useAppTranslation } from "@/i18n/client";
import {
  createSosSession,
  getEmergencyContacts,
  getSosSession,
  resolveSosSession,
  updateSosLocation,
} from "@/lib/api/sos";
import { ApiError } from "@/lib/fetch";
import { clearActiveSos, loadActiveSos, saveActiveSos } from "@/lib/sosSession";
import { formatNominatimPlace } from "@/lib/utils";
import useAuthStore from "@/stores/useAuthStore";
import useMapStore from "@/stores/useMapStore";
import type {
  EmergencyContact,
  HandlingStatus,
  SosTimelineType,
  SosType,
} from "@/types/sos";

const SOS_COUNTDOWN_MS = 5000;
const LOCATION_UPDATE_MS = 12000;
// SVG progress ring geometry (viewBox 160×160, r=70).
const RING_RADIUS = 70;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type SosStep = "countdown" | "active" | "resolved";

/** i18n keys for the family member's fine-grained handling progress. */
const HANDLING_STATUS_LABELS: Record<HandlingStatus, string> = {
  notified: "sosHandlingNotified",
  acknowledged: "sosHandlingAcknowledged",
  claimed: "sosHandlingClaimed",
  en_route: "sosHandlingEnRoute",
  arrived: "sosHandlingArrived",
  resolved: "sosHandlingResolved",
};

/** i18n keys for timeline entry types (append-only event history). */
const TIMELINE_TYPE_LABELS: Record<SosTimelineType, string> = {
  created: "sosTimelineCreated",
  notified: "sosTimelineNotified",
  acknowledged: "sosTimelineAcknowledged",
  claimed: "sosTimelineClaimed",
  status_update: "sosTimelineStatusUpdate",
  resolved: "sosTimelineResolved",
};

function formatTimelineTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Haptic pulse so a pocket mis-tap is noticed even without looking. */
function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported (iOS Safari) — visual countdown still covers it
  }
}

const SOS_SUPPLEMENT_TYPES: {
  key: SosType;
  icon: typeof AlertTriangle;
  labelKey: string;
}[] = [
  { key: "body", icon: AlertTriangle, labelKey: "sosBodyDiscomfort" },
  { key: "trapped", icon: HelpCircle, labelKey: "sosTrapped" },
  { key: "share_location", icon: PersonStanding, labelKey: "sosFall" },
];

export default function SosDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, i18n } = useAppTranslation();
  const userLocation = useMapStore((s) => s.userLocation);
  const authToken = useAuthStore((s) => s.session?.accessToken);
  // Recovery-on-reload bookkeeping: run the localStorage check at most once,
  // and let a recovered open bypass the countdown/create flow.
  const recoveryTriedRef = useRef(false);
  const skipCountdownRef = useRef(false);
  const [step, setStep] = useState<SosStep>("countdown");
  const [secondsLeft, setSecondsLeft] = useState(SOS_COUNTDOWN_MS / 1000);
  /** Elapsed fraction of the countdown (0 → 1), drives the progress ring. */
  const [countdownProgress, setCountdownProgress] = useState(0);
  const [address, setAddress] = useState<string | null>(null);
  const [contactsDialogOpen, setContactsDialogOpen] = useState(false);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [boundContacts, setBoundContacts] = useState<EmergencyContact[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [supplementedType, setSupplementedType] = useState<SosType | null>(
    null,
  );

  // Owner-only realtime lifecycle: who has acknowledged / claimed the SOS and
  // the full event history. Live via SSE, with a polling fallback.
  const { snapshot } = useSosLifecycle(sessionId, step === "active");

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Start countdown immediately when dialog opens
  // biome-ignore lint/correctness/useExhaustiveDependencies: restart only when `open` flips; startSosSession is stable per open cycle
  useEffect(() => {
    if (!open) return;
    // A session recovered from a reload opens straight into the active card —
    // don't restart the countdown or create a second session.
    if (skipCountdownRef.current) {
      skipCountdownRef.current = false;
      return;
    }
    setStep("countdown");
    setSecondsLeft(SOS_COUNTDOWN_MS / 1000);
    setCountdownProgress(0);
    setExpanded(false);
    setTimelineExpanded(false);
    setSupplementedType(null);
    vibrate(80);

    const startedAt = Date.now();
    let lastSecond = SOS_COUNTDOWN_MS / 1000;
    countdownTimer.current = setInterval(() => {
      const left = SOS_COUNTDOWN_MS - (Date.now() - startedAt);
      if (left <= 0) {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        vibrate([120, 60, 120]);
        setStep("active");
        startSosSession();
      } else {
        const second = Math.ceil(left / 1000);
        if (second !== lastSecond) {
          lastSecond = second;
          // Escalating haptics: the last two seconds pulse harder so an
          // accidental trigger gets noticed before it fires.
          vibrate(second <= 2 ? 200 : 70);
        }
        setSecondsLeft(second);
        setCountdownProgress(1 - left / SOS_COUNTDOWN_MS);
      }
    }, 100);

    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      countdownTimer.current = null;
      vibrate(0);
    };
  }, [open]);

  const resetAndClose = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    countdownTimer.current = null;
    setStep("countdown");
    setSessionId(null);
    setBoundContacts([]);
    setExpanded(false);
    setTimelineExpanded(false);
    setSupplementedType(null);
    onOpenChange(false);
  };

  const startSosSession = async () => {
    const loc = useMapStore.getState().userLocation;
    if (!loc) {
      toast.error(t("noLocation"));
      resetAndClose();
      return;
    }
    setCreatingSession(true);
    try {
      const response = await createSosSession({
        type: "body",
        lat: loc.lat,
        lng: loc.lng,
        address: address ?? undefined,
      });
      if (!openRef.current) {
        if (response.data) {
          resolveSosSession(response.data.sessionId).catch(() => {});
        }
        return;
      }
      if (response.data) {
        setSessionId(response.data.sessionId);
        // Persist so a reload can recover this active session.
        saveActiveSos(response.data.sessionId);
      }
    } catch (err) {
      if (openRef.current) {
        toast.error((err as Error).message);
        resetAndClose();
      }
    } finally {
      if (openRef.current) setCreatingSession(false);
    }
  };

  const handleCancelCountdown = () => {
    vibrate(0);
    resetAndClose();
  };

  // Skip the countdown for users who know it's a real emergency.
  const handleSendNow = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    countdownTimer.current = null;
    vibrate([120, 60, 120]);
    setStep("active");
    startSosSession();
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

  useEffect(() => {
    if (step !== "active") return;
    getEmergencyContacts()
      .then((res) => setBoundContacts(res.data?.contacts ?? []))
      .catch(() => {});
  }, [step]);

  // Location-update polling
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

  // Family member (or backend) resolved the event: reflect it instantly from
  // the lifecycle snapshot instead of waiting for a location-push to 400.
  useEffect(() => {
    if (step === "active" && snapshot?.status === "resolved") {
      setStep("resolved");
    }
  }, [step, snapshot?.status]);

  // Clear the persisted session whenever the SOS ends, so a later reload
  // doesn't try to recover a finished event.
  useEffect(() => {
    if (step === "resolved") clearActiveSos();
  }, [step]);

  // Recover an active SOS after a page reload: once auth is ready, look up the
  // stored session id and, if the server says it's still active, drop straight
  // back into the active card (skipping the countdown / create flow).
  useEffect(() => {
    if (recoveryTriedRef.current || open || !authToken) return;
    recoveryTriedRef.current = true;
    const storedId = loadActiveSos();
    if (!storedId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getSosSession(storedId);
        if (cancelled) return;
        if (res.data?.status === "active") {
          skipCountdownRef.current = true;
          setSessionId(storedId);
          setStep("active");
          onOpenChange(true);
        } else if (res.data?.status === "resolved") {
          clearActiveSos(); // already resolved server-side
        }
        // else: unexpected/empty body — keep the id so the next reload retries
      } catch (err) {
        // 404/410 → the session is gone; drop it. Auth/network hiccups →
        // keep it so the next reload can retry.
        if (err instanceof ApiError && (err.code === 404 || err.code === 410)) {
          clearActiveSos();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken, open, onOpenChange]);

  // Reverse geocode
  useEffect(() => {
    if (step !== "active" || !userLocation) return;
    const controller = new AbortController();
    const lang = i18n.language === "zh-TW" ? "zh-TW" : "en";
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLocation.lat}&lon=${userLocation.lng}&accept-language=${lang}&zoom=16&addressdetails=1`,
      { signal: controller.signal },
    )
      .then((res) => res.json())
      .then((data) => {
        const formatted = formatNominatimPlace(data, i18n.language);
        setAddress(formatted?.display_name ?? null);
      })
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

  const handlerName = snapshot?.claimedByName ?? null;
  const handlingStatus = snapshot?.handlingStatus ?? null;
  const ackCount = snapshot?.acknowledgements.length ?? 0;
  const timeline = snapshot?.timeline ?? [];
  const isClaimed = Boolean(handlerName);
  // Always-visible one-liner: prefer the active handler + their status,
  // else how many family members have confirmed receipt.
  const handlingSummary = handlerName
    ? `${handlerName}・${t(HANDLING_STATUS_LABELS[handlingStatus ?? "claimed"])}`
    : ackCount > 0
      ? t("sosAckCount", { count: ackCount })
      : t("sosContinuousSharing");

  // When in active state, render as non-modal floating card
  if (open && step === "active" && sessionId) {
    return (
      <>
        <div className="fixed top-[env(safe-area-inset-top,12px)] left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-auto lg:left-auto lg:right-4 lg:translate-x-0 lg:top-4">
          <div className="bg-background/95 backdrop-blur-md border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden">
            {/* Compact header - always visible */}
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-sm font-bold text-red-600">
                  {t("sosActiveTitle")}
                </span>
                <span
                  className={`text-xs ${
                    isClaimed
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {handlingSummary}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Expanded content — capped + scrollable so the resolve button
                stays reachable on short screens no matter how long the
                timeline / contact list grows. */}
            {expanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3 max-h-[65vh] overflow-y-auto overscroll-contain">
                {/* Who is handling this SOS (live via SSE) */}
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-2.5 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("sosHandlingLabel")}
                  </p>
                  {isClaimed ? (
                    <p className="text-sm font-semibold text-foreground">
                      {handlerName}
                      <span className="ml-1.5 font-normal text-red-600">
                        {t(HANDLING_STATUS_LABELS[handlingStatus ?? "claimed"])}
                      </span>
                    </p>
                  ) : ackCount > 0 ? (
                    <p className="text-sm">
                      {t("sosAckCount", { count: ackCount })}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("sosWaitingFamily")}
                    </p>
                  )}
                </div>

                {/* Supplement type */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("sosSupplementType")}
                  </p>
                  <div className="flex gap-2">
                    {SOS_SUPPLEMENT_TYPES.map(
                      ({ key, icon: Icon, labelKey }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSupplementedType(key)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            supplementedType === key
                              ? "bg-red-500/10 border-red-500/40 text-red-600"
                              : "border-border/60 text-muted-foreground hover:bg-muted/60"
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          {t(labelKey)}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* Notified contacts */}
                <div className="rounded-xl bg-muted/30 p-2.5 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("sosNotifiedContacts")}
                  </p>
                  {boundContactNames.length > 0 ? (
                    <p className="text-sm">{boundContactNames.join("、")}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("sosNoContacts")}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div className="rounded-xl bg-muted/30 p-2.5 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {t("sosCurrentLocation")}
                  </p>
                  <p className="text-xs">{address ?? t("locating")}</p>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    asChild
                    variant="destructive"
                    className="rounded-xl h-11 gap-1.5 text-sm font-bold"
                  >
                    <a href="tel:110">
                      <PhoneCall className="h-4 w-4" />
                      {t("sosCall110")}
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="destructive"
                    className="rounded-xl h-11 gap-1.5 text-sm font-bold"
                  >
                    <a href="tel:119">
                      <PhoneCall className="h-4 w-4" />
                      {t("sosCall119")}
                    </a>
                  </Button>
                </div>

                {/* Share */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    {t("sosManualShareLabel")}
                  </p>
                  <ShareTargets message={sosMessage} />
                </div>

                {/* Event timeline — collapsed by default to keep the card
                    compact; tap the header to expand. */}
                {timeline.length > 0 && (
                  <div className="rounded-xl bg-muted/30 p-2.5">
                    <button
                      type="button"
                      onClick={() => setTimelineExpanded((v) => !v)}
                      aria-expanded={timelineExpanded}
                      className="w-full flex items-center justify-between"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("sosTimelineLabel")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {timeline.length}
                        </span>
                        {timelineExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>
                    {timelineExpanded && (
                      <ol className="mt-2 space-y-1.5">
                        {timeline.map((entry, i) => (
                          <li
                            key={`${entry.type}-${entry.at}-${i}`}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500/60" />
                            <span className="text-muted-foreground tabular-nums">
                              {formatTimelineTime(entry.at)}
                            </span>
                            <span className="flex-1 text-foreground">
                              {entry.actorName ? `${entry.actorName} ` : ""}
                              {t(TIMELINE_TYPE_LABELS[entry.type])}
                              {entry.note ? `・${entry.note}` : ""}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {/* Resolve */}
                <Button
                  variant="outline"
                  onClick={handleResolve}
                  className="w-full rounded-xl h-11 text-sm"
                >
                  {t("sosResolveButton")}
                </Button>

                {/* Manage contacts link */}
                <button
                  type="button"
                  onClick={() => setContactsDialogOpen(true)}
                  className="w-full text-center text-xs text-primary underline"
                >
                  {t("sosManageContactsLink")}
                </button>
              </div>
            )}
          </div>
        </div>

        <EmergencyContactsDialog
          open={contactsDialogOpen}
          onOpenChange={setContactsDialogOpen}
        />
      </>
    );
  }

  // Loading state while creating session
  if (open && step === "active" && creatingSession && !sessionId) {
    return (
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetAndClose();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl p-6">
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-red-600" />
            <DialogTitle className="text-lg font-bold text-red-600">
              {t("sosActiveTitle")}
            </DialogTitle>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        open={open && (step === "countdown" || step === "resolved")}
        onOpenChange={(v) => {
          // During the countdown an overlay tap / ESC must not silently
          // abort the SOS — cancelling is only the explicit button.
          if (!v && step === "countdown") return;
          if (!v) resetAndClose();
        }}
      >
        <DialogContent
          className="max-w-md rounded-2xl p-6"
          showCloseButton={step !== "countdown"}
          onPointerDownOutside={(e) => {
            if (step === "countdown") e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (step === "countdown") e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (step === "countdown") e.preventDefault();
          }}
        >
          {step === "countdown" && (
            <div className="space-y-6 flex flex-col items-center py-2">
              <DialogHeader className="w-full">
                <DialogTitle className="text-2xl font-bold text-center text-red-600">
                  {t("sosCountdownTitle")}
                </DialogTitle>
                <p className="text-base text-muted-foreground text-center">
                  {t("sosCountdownDesc")}
                </p>
              </DialogHeader>

              {/* Progress ring — the whole circle is a tap-to-cancel target,
                  maximising the cancellable area for shaky hands. */}
              <button
                type="button"
                onClick={handleCancelCountdown}
                aria-label={t("sosCountdownCancel")}
                className="relative h-40 w-40 rounded-full focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-4"
              >
                <svg
                  viewBox="0 0 160 160"
                  className="absolute inset-0 h-full w-full -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="80"
                    cy="80"
                    r={RING_RADIUS}
                    fill="none"
                    strokeWidth="8"
                    className="stroke-red-500/15"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r={RING_RADIUS}
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="stroke-red-500 transition-[stroke-dashoffset] duration-100 ease-linear"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE * countdownProgress}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-6xl font-black tabular-nums text-red-600">
                  {secondsLeft}
                </span>
              </button>

              <p className="text-sm text-muted-foreground text-center">
                {t("sosCountdownHint")}
              </p>

              {/* Cancel is the dominant action: an accidental trigger must be
                  trivially recoverable for elderly / low-vision users. */}
              <div className="w-full space-y-2.5">
                <Button
                  variant="secondary"
                  onClick={handleCancelCountdown}
                  className="w-full rounded-xl h-14 text-lg font-bold"
                >
                  {t("sosCountdownCancel")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSendNow}
                  className="w-full rounded-xl h-11 text-sm text-red-600 hover:text-red-700 hover:bg-red-500/10"
                >
                  {t("sosSendNow")}
                </Button>
              </div>
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
