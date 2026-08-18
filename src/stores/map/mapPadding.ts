const SIDEBAR_RAIL_W = 56;
const SIDEBAR_GAP = 12;
const SIDEBAR_PANEL_W = 380;
const SIDEBAR_TOTAL = SIDEBAR_RAIL_W + SIDEBAR_GAP + SIDEBAR_PANEL_W + 16;

export function computeMapPadding(sidebarCollapsed: boolean): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const left =
    isDesktop && !sidebarCollapsed ? SIDEBAR_TOTAL + 32 : isDesktop ? 80 : 50;
  return { top: 80, bottom: 200, left, right: 50 };
}
