"use client";

import { AlertTriangle, HelpCircle, Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getPublicSosSession } from "@/lib/api/sos";
import { ApiError } from "@/lib/fetch";
import type { SosPublicSession, SosType } from "@/types/sos";

const POLL_MS = 10000;
const BBOX_DELTA = 0.003;

type Phase =
  | "loading"
  | "active"
  | "resolved"
  | "not_found"
  | "expired"
  | "error";

const SOS_TYPE_LABEL_KEY: Record<SosType, string> = {
  body: "sosBodyDiscomfort",
  trapped: "sosTrapped",
  share_location: "sosShareLocationType",
};

const SOS_TYPE_ICON: Record<SosType, typeof AlertTriangle> = {
  body: AlertTriangle,
  trapped: HelpCircle,
  share_location: MapPin,
};

export default function SosTrackingView({
  shareToken,
}: {
  shareToken: string;
}) {
  const { t, i18n } = useAppTranslation();
  const [session, setSession] = useState<SosPublicSession | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stopPolling = () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };

    const tick = async () => {
      try {
        const res = await getPublicSosSession(shareToken);
        if (!res.data) return;
        setSession(res.data);
        if (res.data.status === "resolved") {
          setPhase("resolved");
          stopPolling();
        } else {
          setPhase("active");
        }
      } catch (err) {
        if (err instanceof ApiError && err.code === 404) {
          setPhase("not_found");
          stopPolling();
          return;
        }
        if (err instanceof ApiError && err.code === 410) {
          setPhase("expired");
          stopPolling();
          return;
        }
        setSession((prev) => {
          if (!prev) setPhase("error");
          return prev;
        });
      }
    };

    tick();
    pollTimer.current = setInterval(tick, POLL_MS);
    return stopPolling;
  }, [shareToken]);

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (phase === "not_found") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">{t("sosTrackingNotFound")}</p>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">{t("sosTrackingExpired")}</p>
      </div>
    );
  }

  if (phase === "error" && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">{t("sosTrackingError")}</p>
      </div>
    );
  }

  if (!session) return null;

  const Icon = SOS_TYPE_ICON[session.type];
  const lang = i18n.language === "zh-TW" ? "zh-TW" : "en";
  const updatedAtLabel = new Date(session.updatedAt).toLocaleString(lang);
  const bbox = [
    session.lng - BBOX_DELTA,
    session.lat - BBOX_DELTA,
    session.lng + BBOX_DELTA,
    session.lat + BBOX_DELTA,
  ].join(",");
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${session.lat},${session.lng}`;

  return (
    <div className="min-h-screen p-4 space-y-4 max-w-md mx-auto">
      {phase === "resolved" && (
        <div className="rounded-xl bg-green-500/10 p-3 text-center text-sm font-semibold text-green-700">
          {t("sosTrackingResolved")}
        </div>
      )}

      <div className="rounded-xl bg-muted/30 p-3 flex items-center gap-2">
        <span className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-red-600" />
        </span>
        <span className="text-sm font-semibold">
          {t(SOS_TYPE_LABEL_KEY[session.type])}
        </span>
      </div>

      <div className="rounded-xl bg-muted/30 p-3 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {session.address ?? t("myLocation")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("sosTrackingUpdatedAt", { time: updatedAtLabel })}
        </p>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/60 h-64">
        <iframe
          title="sos-location"
          src={embedSrc}
          className="w-full h-full"
          loading="lazy"
        />
      </div>
    </div>
  );
}
