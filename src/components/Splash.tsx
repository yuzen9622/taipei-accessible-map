"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useAppTranslation } from "@/i18n/client";

type SplashProps = {
  show?: boolean;
};

export default function Splash({ show = true }: SplashProps) {
  const { t } = useAppTranslation("translation");
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-background"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={
                reduceMotion ? { opacity: 1 } : { opacity: 1, scale: [0.8, 1] }
              }
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Image
                src="/logo.webp"
                alt={t("title")}
                width={100}
                height={100}
                draggable={false}
                priority
              />
            </motion.div>
            <div className="overflow-hidden">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={
                  reduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, x: ["-100%", "0%"] }
                }
                transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                className="text-[36px] leading-[40px] font-bold whitespace-nowrap"
              >
                {t("title")}
              </motion.h1>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
