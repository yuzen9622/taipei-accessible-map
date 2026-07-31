"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import useReducedMotion from "@/hook/useReducedMotion";
import { useAppTranslation } from "@/i18n/client";
import useOnboardingStore from "@/stores/useOnboardingStore";

/**
 * S3b of the UX blueprint: a 3-step spotlight tour over real UI, triggered by
 * the "帶我看一遍" button on `WelcomeCard`. Mounted once at the app shell
 * level (not inside `HomeContent`) because its targets — the search bar, the
 * a11y filter chip, the SOS button — live in different component trees;
 * finding them by `data-coach` attribute via `document.querySelector` avoids
 * having to thread refs through unrelated components.
 */
const STEP_SELECTORS = [
  '[data-coach="search"]',
  '[data-coach="a11y"]',
  '[data-coach="sos"]',
] as const;
const STEP_COUNT = STEP_SELECTORS.length;
const TITLE_KEYS = [
  "coachMarks.step1Title",
  "coachMarks.step2Title",
  "coachMarks.step3Title",
];
const BODY_KEYS = [
  "coachMarks.step1Body",
  "coachMarks.step2Body",
  "coachMarks.step3Body",
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function CoachMarks() {
  const { t } = useAppTranslation();
  const reduceMotion = useReducedMotion();
  const { active, finishCoachMarks } = useOnboardingStore(
    useShallow((s) => ({
      active: s.coachMarksActive,
      finishCoachMarks: s.finishCoachMarks,
    })),
  );
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) setStep(0);
  }, [active]);

  const measure = useCallback(() => {
    const el = document.querySelector(STEP_SELECTORS[step]);
    if (!el) {
      // Target isn't on screen right now (e.g. the a11y chip was removed
      // from quick actions) — showing a spotlight on nothing would be worse
      // than skipping straight past this step.
      setStep((s) => (s < STEP_COUNT - 1 ? s + 1 : s));
      if (step === STEP_COUNT - 1) finishCoachMarks();
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step, finishCoachMarks]);

  useEffect(() => {
    if (!active) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, measure]);

  useEffect(() => {
    if (active && rect) nextBtnRef.current?.focus();
  }, [active, rect]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finishCoachMarks();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, finishCoachMarks]);

  if (!active || !rect) return null;

  const isLast = step === STEP_COUNT - 1;

  const handleNext = () => {
    if (isLast) finishCoachMarks();
    else setStep((s) => s + 1);
  };

  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const placeBelow = spaceBelow > 160;
  const tooltipWidth = Math.min(320, window.innerWidth - 32);
  const tooltipLeft = Math.min(
    Math.max(rect.left, 16),
    window.innerWidth - tooltipWidth - 16,
  );

  // Only two focusable elements in the tooltip; a hand-rolled 2-element trap
  // is simpler and more auditable here than pulling in a focus-trap library.
  const handleTrapKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusable =
      tooltipRef.current?.querySelectorAll<HTMLElement>("button");
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-(--z-onboarding)">
      {/* Spotlight: one element whose box-shadow paints the dimmed overlay
          everywhere except a rounded "hole" over the target rect — cheaper
          than an SVG mask and trivial to animate between steps. */}
      <motion.div
        className="pointer-events-none fixed rounded-2xl"
        initial={false}
        animate={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }
        }
        style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)" }}
      />

      {/* Blocks interaction with the rest of the app while the tour is up —
          intentionally has no onClick of its own, Esc/Skip/Done are the only
          exits, so an accidental tap elsewhere can't silently end the tour. */}
      <div className="fixed inset-0" />

      <div aria-live="polite" className="sr-only">
        {t("coachMarks.stepOf", { current: step + 1, total: STEP_COUNT })}
        {". "}
        {t(TITLE_KEYS[step])}
        {". "}
        {t(BODY_KEYS[step])}
        {step === 0 && `. ${t("coachMarks.escHint")}`}
      </div>

      <motion.div
        ref={tooltipRef}
        key={step}
        role="dialog"
        aria-modal="true"
        onKeyDown={handleTrapKeyDown}
        initial={
          reduceMotion ? { opacity: 1 } : { opacity: 0, y: placeBelow ? -8 : 8 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
        className="fixed z-10 rounded-2xl bg-background p-4 shadow-2xl"
        style={{
          width: tooltipWidth,
          left: tooltipLeft,
          ...(placeBelow
            ? { top: rect.top + rect.height + 12 }
            : { bottom: window.innerHeight - rect.top + 12 }),
        }}
      >
        <p className="mb-1 text-sm font-semibold">{t(TITLE_KEYS[step])}</p>
        <p className="mb-3 text-sm text-muted-foreground">
          {t(BODY_KEYS[step])}
        </p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finishCoachMarks}
            className="text-xs text-muted-foreground hover:underline"
          >
            {t("coachMarks.skip")}
          </button>
          <button
            ref={nextBtnRef}
            type="button"
            onClick={handleNext}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isLast ? t("coachMarks.done") : t("coachMarks.next")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
