"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import useStatusStore from "@/stores/useStatusStore";

export default function StatusBar() {
  const { state, message, enabled } = useStatusStore();

  if (!enabled) return null;

  return (
    <div
      className="px-4 py-1.5 border-t border-border/20 flex items-center gap-2 min-h-[28px] shrink-0"
      aria-live="polite"
      aria-atomic="true"
    >
      {state === "idle" && (
        <span className="text-xs text-muted-foreground/60">{message}</span>
      )}
      {state === "loading" && (
        <>
          <Loader2 className="h-3 w-3 text-muted-foreground animate-spin shrink-0" />
          <span className="text-xs text-muted-foreground">{message}</span>
        </>
      )}
      {state === "success" && (
        <>
          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400">{message}</span>
        </>
      )}
      {state === "error" && (
        <>
          <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-600 dark:text-amber-400">{message}</span>
        </>
      )}
    </div>
  );
}
