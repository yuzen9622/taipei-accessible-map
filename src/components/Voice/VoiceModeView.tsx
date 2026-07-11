"use client";

import { Keyboard, Loader2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import useVoiceStore from "@/stores/useVoiceStore";
import {
  getVoiceStatusLabel,
  isVoiceSessionActive,
} from "./VoiceFloatingIndicator";

/**
 * Voice mode view rendered as `AIChatBot`'s panel body while a voice
 * session is in `viewMode === "panel"` (plan §4 VoiceModeView row):
 * connection status, transcripts (`aria-live="polite"`), tool activity,
 * a "tap to resume playback" affordance, an end-session button, and a
 * "back to text" button that switches the panel back to the ordinary text
 * chat without ending the session (it keeps running, surfaced instead by
 * `VoiceFloatingIndicator`).
 */
export default function VoiceModeView() {
  const { t } = useAppTranslation();
  const status = useVoiceStore((s) => s.status);
  const transcripts = useVoiceStore((s) => s.transcripts);
  const activeTool = useVoiceStore((s) => s.activeTool);
  const endSession = useVoiceStore((s) => s.endSession);
  const resumePlayback = useVoiceStore((s) => s.resumePlayback);
  const setViewMode = useVoiceStore((s) => s.setViewMode);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcripts.length > 0 || activeTool) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [transcripts, activeTool]);

  const label = getVoiceStatusLabel(status, t);
  const active = isVoiceSessionActive(status.status);
  const listening = status.status === "listening" || status.status === "ready";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40 text-xs shrink-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {active && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2.5 w-2.5 rounded-full",
              active ? "bg-red-500" : "bg-muted-foreground",
            )}
          />
        </span>
        <span className="font-medium text-foreground">{label}</span>
      </div>

      <div
        className="flex-1 overflow-auto px-4 py-3 space-y-3"
        aria-live="polite"
      >
        {transcripts.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            {listening
              ? t("chatbot.voice.listeningHint", "請開始說話")
              : t("chatbot.voice.connectingHint", "連線中，請稍候…")}
          </p>
        )}

        {transcripts.map((entry) => (
          <div
            key={entry.id}
            className={cn(
              "flex flex-col gap-1",
              entry.role === "user" ? "items-end" : "items-start",
            )}
          >
            <span className="text-[10px] text-muted-foreground px-1">
              {entry.role === "user"
                ? t("chatbot.voice.transcriptUser", "你")
                : t("chatbot.voice.transcriptModel", "助理")}
            </span>
            <div
              className={cn(
                "max-w-[85%] w-fit px-3 py-2 rounded-2xl text-sm",
                entry.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted rounded-tl-sm shadow-sm border border-border/30",
              )}
            >
              {entry.text}
            </div>
          </div>
        ))}

        {activeTool && (
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-1.5 px-1">
            {activeTool.type === "call" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70 shrink-0" />
                <span className="animate-pulse">
                  {t("chatbot.voice.toolQuerying", "查詢中…")}（
                  {activeTool.name}）
                </span>
              </>
            ) : (
              <span>
                {t("chatbot.voice.toolDone", "完成")}（{activeTool.name}）
              </span>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {status.status === "playback-blocked" && (
        <div className="px-4 py-2 border-t bg-card shrink-0">
          <Button
            type="button"
            onClick={resumePlayback}
            size="sm"
            variant="outline"
            className="w-full"
          >
            {t("chatbot.voice.resumePlayback", "點擊以繼續播放")}
          </Button>
        </div>
      )}

      <div className="p-3 border-t bg-card flex items-center gap-2 shrink-0">
        <Button
          type="button"
          onClick={() => setViewMode("pill")}
          size="sm"
          variant="ghost"
          className="flex-1"
        >
          <Keyboard className="h-4 w-4 mr-1.5" />
          {t("chatbot.voice.backToText", "切回文字")}
        </Button>
        <Button
          type="button"
          onClick={endSession}
          size="sm"
          variant="destructive"
          className="flex-1"
        >
          <X className="h-4 w-4 mr-1.5" />
          {t("chatbot.voice.endSession", "結束語音對話")}
        </Button>
      </div>
    </div>
  );
}
