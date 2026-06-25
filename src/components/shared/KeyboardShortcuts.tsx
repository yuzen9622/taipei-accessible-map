"use client";

import { Keyboard, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useAppTranslation } from "@/i18n/client";

const SHORTCUTS = [
  { keys: ["?"], action: "shortcutHelp" },
  { keys: ["/"], action: "shortcutSearch" },
  { keys: ["Esc"], action: "shortcutClose" },
  { keys: ["M"], action: "shortcutMyLocation" },
] as const;

export default function KeyboardShortcuts() {
  const { t } = useAppTranslation();
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    },
    [open]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("keyboardShortcuts")}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="bg-background rounded-2xl shadow-2xl border border-border/50 w-[90vw] max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" />
                {t("keyboardShortcuts")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
                aria-label={t("close")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                >
                  <span className="text-sm text-foreground">
                    {t(shortcut.action)}
                  </span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="min-w-[28px] h-7 px-2 flex items-center justify-center text-xs font-mono font-semibold bg-muted rounded-lg border border-border/50 shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              {t("shortcutHint")}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
