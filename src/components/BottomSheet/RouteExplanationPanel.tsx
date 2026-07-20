"use client";

import { AlertCircle, Lightbulb, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppTranslation } from "@/i18n/client";
import { explainRoute } from "@/lib/api/ai";
import useMapStore from "@/stores/useMapStore";
import type { RouteExplanation } from "@/types/route";

export default function RouteExplanationPanel({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t, i18n } = useAppTranslation();
  const { selectRoute } = useMapStore(
    useShallow((s) => ({ selectRoute: s.selectRoute })),
  );
  const [explanation, setExplanation] = useState<RouteExplanation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectRoute?.route) return;
    setLoading(true);
    explainRoute(selectRoute.route, "normal", i18n.language as "zh-TW" | "en")
      .then((res) => {
        if (res.ok && res.data) setExplanation(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectRoute?.route, i18n.language]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-violet-500" />
          {t("aiExplanation")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t("assistThinking")}</span>
        </div>
      ) : !explanation ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("noData")}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-4">
            <p className="text-sm leading-relaxed">{explanation.summary}</p>
          </div>

          {/* Highlights */}
          {explanation.accessibilityHighlights.length > 0 && (
            <div className="space-y-1.5">
              {explanation.accessibilityHighlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {explanation.warnings.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-red-500 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                {t("warnings")}
              </h3>
              {explanation.warnings.map((w, i) => (
                <p key={i} className="text-sm text-muted-foreground ml-5.5">
                  {w}
                </p>
              ))}
            </div>
          )}

          {/* Alternatives */}
          {explanation.alternatives && (
            <div className="rounded-xl bg-muted/40 p-3">
              <h3 className="text-sm font-semibold mb-1">
                {t("alternatives")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {explanation.alternatives}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
