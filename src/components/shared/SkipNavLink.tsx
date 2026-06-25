"use client";

import { useAppTranslation } from "@/i18n/client";

export default function SkipNavLink() {
  const { t } = useAppTranslation();

  return (
    <a
      href="#main-map"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-1/2 focus:-translate-x-1/2 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:shadow-lg focus:text-sm focus:font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t("skipToMap")}
    </a>
  );
}
