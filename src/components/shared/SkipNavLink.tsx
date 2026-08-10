"use client";

import { useAppTranslation } from "@/i18n/client";

const LINK_CLASS =
  "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-1/2 focus:-translate-x-1/2 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:shadow-lg focus:text-sm focus:font-semibold focus:outline-none focus:ring-2 focus:ring-ring";

export default function SkipNavLink() {
  const { t } = useAppTranslation();

  // Search/functions panel and map controls (zoom, attribution) both mount
  // twice — once for mobile, once for desktop, one of them `inert` — so a
  // plain `href="#id"` can't target "the search box" (duplicate ids aren't
  // valid HTML, and even a single shared id could resolve to the inert
  // copy). Same offsetParent/inert-aware resolution CoachMarks already uses
  // for its dual-mounted spotlight targets.
  const focusSearch = () => {
    const candidates = document.querySelectorAll<HTMLElement>(
      '[data-coach="search"]',
    );
    const container = Array.from(candidates).find(
      (c) => c.offsetParent !== null && !c.closest("[inert]"),
    );
    const input = container?.querySelector<HTMLElement>("input");
    input?.focus();
  };

  return (
    <>
      {/* A <button>, not an anchor — this jumps focus via JS (see
          `focusSearch`'s doc comment), it never navigates anywhere. */}
      <button type="button" onClick={focusSearch} className={LINK_CLASS}>
        {t("skipToSearch", "跳至搜尋與功能面板")}
      </button>
      <a href="#main-map" className={LINK_CLASS}>
        {t("skipToMap")}
      </a>
    </>
  );
}
