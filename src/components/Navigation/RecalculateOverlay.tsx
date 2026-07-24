"use client";

import { AlertTriangle, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAppTranslation } from "@/i18n/client";

export interface RecalculateContext {
  hazardCount: number;
  facilityCount: number;
}

const PHASE_STEP_MS = 350;

export default function RecalculateOverlay({
  context,
  visible,
}: {
  context: RecalculateContext;
  visible: boolean;
}) {
  const { t } = useAppTranslation();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!visible) {
      setPhase(0);
      return;
    }
    setPhase(1);

    const items: number[] = [];
    if (context.hazardCount > 0) items.push(2);
    if (context.facilityCount > 0) items.push(3);
    if (items.length === 0) return;

    let idx = 0;
    const timer = setInterval(() => {
      if (idx < items.length) {
        setPhase(items[idx]);
        idx++;
      } else {
        clearInterval(timer);
      }
    }, PHASE_STEP_MS);

    return () => clearInterval(timer);
  }, [visible, context.hazardCount, context.facilityCount]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.output
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="block rounded-2xl bg-slate-900/95 text-white shadow-2xl p-4 space-y-2"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <Loader2
              className="h-5 w-5 animate-spin text-blue-400 shrink-0"
              aria-hidden
            />
            <p className="text-sm font-semibold">{t("recalculating")}</p>
          </div>

          <div className="space-y-1.5 pl-8">
            <AnimatePresence mode="popLayout">
              {phase >= 1 && (
                <ContextLine
                  key="route"
                  icon={
                    <MapPin className="h-3.5 w-3.5 text-blue-400" aria-hidden />
                  }
                  text={t("recalcAnalyzingRoute")}
                />
              )}
              {phase >= 2 && context.hazardCount > 0 && (
                <ContextLine
                  key="hazard"
                  icon={
                    <AlertTriangle
                      className="h-3.5 w-3.5 text-amber-400"
                      aria-hidden
                    />
                  }
                  text={t("recalcHazards", { count: context.hazardCount })}
                />
              )}
              {phase >= 3 && context.facilityCount > 0 && (
                <ContextLine
                  key="facility"
                  icon={
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-green-400"
                      aria-hidden
                    />
                  }
                  text={t("recalcFacilities", {
                    count: context.facilityCount,
                  })}
                />
              )}
            </AnimatePresence>
          </div>
        </motion.output>
      )}
    </AnimatePresence>
  );
}

function ContextLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2"
    >
      {icon}
      <span className="text-xs text-white/80">{text}</span>
    </motion.div>
  );
}
