"use client";

import { Copy } from "lucide-react";
import Image from "next/image";
import { useCallback } from "react";
import { toast } from "sonner";
import { useAppTranslation } from "@/i18n/client";

// Shared LINE / WhatsApp / copy-link grid used by both the plain share
// dialog and the SOS "active" screen's manual-dispatch fallback.
export default function ShareTargets({ message }: { message: string }) {
  const { t } = useAppTranslation();

  const handleLine = useCallback(() => {
    window.open(
      `https://line.me/R/share?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener",
    );
  }, [message]);

  const handleWhatsApp = useCallback(() => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener",
    );
  }, [message]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success(t("linkCopied"));
    } catch {
      // Clipboard API needs focus + secure context; fall back to execCommand
      // for in-app browsers (e.g. LINE) and older engines.
      const textarea = document.createElement("textarea");
      textarea.value = message;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (copied) toast.success(t("linkCopied"));
      else toast.error(t("copyFailed"));
    }
  }, [message, t]);

  return (
    <div className="grid grid-cols-3 gap-3">
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
        <Image src="/whatsapp-icon.svg" alt="WhatsApp" width={28} height={28} />
        <span className="text-sm font-semibold">{t("shareToWhatsApp")}</span>
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
  );
}
