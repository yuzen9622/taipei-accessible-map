"use client";

import {
  Accessibility,
  AlertTriangle,
  Bookmark,
  BotMessageSquare,
  Bus,
  ChevronLeft,
  ChevronRight,
  CircleParking,
  Cloud,
  Heart,
  Menu,
  Navigation,
  Search,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import AIChatBot from "@/components/AIChatBot";
import ExitNavDialog from "@/components/Navigation/ExitNavDialog";
import AccountLogin from "@/components/shared/AccountLogin";
import useIsDesktop from "@/hook/useIsDesktop";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { RailPanel } from "@/stores/useMapStore";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";
import useOnboardingStore from "@/stores/useOnboardingStore";
import A11yPanel from "./A11yPanel";
import BusPanel from "./BusPanel";
import EnvironmentPanel from "./EnvironmentPanel";
import HazardReportPanel from "./HazardReportPanel";
import HomeContent from "./HomeContent";
import NavigationContent from "./NavigationContent";
import ParkingPanel from "./ParkingPanel";
import PlaceContent from "./PlaceContent";
import RouteContent from "./RouteContent";
import RoutePlanContent from "./RoutePlanContent";
import SavedPlacesPanel from "./SavedPlacesPanel";
import StationDetailContent from "./StationDetailContent";
import WelfarePanel from "./WelfarePanel";

const SNAP_POINTS = {
  peek: 0.12,
  half: 0.38,
  full: 0.92,
};

// --- Rail icon definitions ---
interface RailItem {
  id: RailPanel;
  Icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  color: string;
}

const RAIL_ITEMS: RailItem[] = [
  { id: "search", Icon: Search, labelKey: "railSearch", color: "text-primary" },
  {
    id: "a11y",
    Icon: Accessibility,
    labelKey: "railA11y",
    color: "text-accessibility",
  },
  { id: "bus", Icon: Bus, labelKey: "railBus", color: "text-emerald-600" },
  {
    id: "parking",
    Icon: CircleParking,
    labelKey: "railParking",
    color: "text-indigo-500",
  },
  {
    id: "saved",
    Icon: Bookmark,
    labelKey: "savedPlaces",
    color: "text-amber-500",
  },
  {
    id: "hazard",
    Icon: AlertTriangle,
    labelKey: "reportHazard",
    color: "text-amber-500",
  },
];

// Superset of the quick actions in the search panel, so everything reachable
// from 快捷功能 is also reachable from 更多.
const RAIL_MORE_ITEMS: RailItem[] = [
  {
    id: "route",
    Icon: Navigation,
    labelKey: "railRoute",
    color: "text-blue-500",
  },
  {
    id: "environment",
    Icon: Cloud,
    labelKey: "environment",
    color: "text-sky-500",
  },
  { id: "welfare", Icon: Heart, labelKey: "welfare", color: "text-rose-500" },
];

// --- Mode-driven panels: shown via sheetMode, override rail panels ---
const MODE_PANELS = new Set([
  "place",
  "plan",
  "route",
  "navigation",
  "station",
]);

// Rail panels that render their own content component. "search" and "none"
// both fall through to HomeContent, and "route" is only ever a leftover from
// RoutePreviewHydrator (the rail routes it through sheetMode="plan" instead),
// so none of those three count as "a sub-panel is showing". RailPanelOrHome
// reads the same set, so "is a panel open" can never disagree with what's
// actually rendered.
const RAIL_CONTENT_PANELS = new Set<RailPanel>([
  "a11y",
  "bus",
  "parking",
  "saved",
  "environment",
  "hazard",
  "welfare",
]);

export default function BottomSheet() {
  const { t } = useAppTranslation();
  const {
    sheetMode,
    sidebarCollapsed: collapsed,
    setSidebarCollapsed: setCollapsed,
    activeRailPanel,
    setActiveRailPanel,
    setSheetMode,
    setComputeRoutes,
    setRouteA11y,
    setRouteSelect,
    setInfoShow,
    setSearchPlace,
    isNavigating,
    requestNavExit,
    chatOpen,
    setChatOpen,
  } = useMapStore(
    useShallow((s) => ({
      sheetMode: s.sheetMode,
      sidebarCollapsed: s.sidebarCollapsed,
      setSidebarCollapsed: s.setSidebarCollapsed,
      activeRailPanel: s.activeRailPanel,
      setActiveRailPanel: s.setActiveRailPanel,
      setSheetMode: s.setSheetMode,
      setComputeRoutes: s.setComputeRoutes,
      setRouteA11y: s.setRouteA11y,
      chatOpen: s.chatOpen,
      setChatOpen: s.setChatOpen,
      setRouteSelect: s.setRouteSelect,
      setInfoShow: s.setInfoShow,
      setSearchPlace: s.setSearchPlace,
      isNavigating: s.isNavigating,
      requestNavExit: s.requestNavExit,
    })),
  );
  const isDesktop = useIsDesktop();
  const coachMarksActive = useOnboardingStore((s) => s.coachMarksActive);
  const stepListOpen = useNavStore((s) => s.stepListOpen);
  const setStepListOpen = useNavStore((s) => s.setStepListOpen);
  const [snap, setSnap] = useState<"peek" | "half" | "full">("peek");
  const [sheetHeight, setSheetHeight] = useState(SNAP_POINTS.peek);
  const [isDragging, setIsDragging] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Hide the home header at peek so only the search bar is visible,
  // keeping the map maximally exposed (Google Maps-style peek).
  const atPeek = sheetHeight <= SNAP_POINTS.peek + 0.02;

  // The AI assistant is sheet content, not a floating card — the nav HUD
  // owns the screen mid-navigation so it never competes with that.
  const showAssistant = chatOpen && !isNavigating;

  // Whether the content panel (Layer 2) is open on desktop
  const modePanelActive = MODE_PANELS.has(sheetMode);
  const railPanelActive = !modePanelActive && activeRailPanel !== "none";
  const panelOpen = modePanelActive || railPanelActive || showAssistant;

  // A rail *sub-panel* (無障礙設施 / 公車 / …) is showing rather than the search
  // home view. Mobile has no rail to render an active indicator on, so this is
  // what earns the header a back button — checking `activeRailPanel !== "none"`
  // instead would light it up on first load, since the store starts at
  // "search" and that renders plain HomeContent.
  const railContentActive =
    !modePanelActive && RAIL_CONTENT_PANELS.has(activeRailPanel);

  // Map-first navigation: the HUD owns the screen; the sheet/panel only
  // reappears as the step list when requested from the HUD.
  const navHidesChrome = isNavigating && !stepListOpen;

  // Publish the sheet's live height as a CSS variable so floating map
  // controls (SOS, recenter, …) can ride just above the sheet instead of
  // sitting at hardcoded offsets that drift out of sync when the user drags.
  useEffect(() => {
    const ratio = navHidesChrome ? 0 : sheetHeight;
    document.documentElement.style.setProperty(
      "--bottom-sheet-h",
      `${(ratio * 100).toFixed(1)}dvh`,
    );
  }, [sheetHeight, navHidesChrome]);

  useEffect(() => {
    switch (sheetMode) {
      case "home":
        setSnap("peek");
        setSheetHeight(SNAP_POINTS.peek);
        break;
      case "place":
      case "plan":
      case "route":
      case "station":
        setSnap("half");
        setSheetHeight(SNAP_POINTS.half);
        break;
      case "navigation":
        setSnap("peek");
        setSheetHeight(SNAP_POINTS.peek);
        break;
    }
  }, [sheetMode]);

  // When sheetMode goes to a mode panel, collapse rail panel
  useEffect(() => {
    if (modePanelActive) {
      setMoreOpen(false);
    }
  }, [modePanelActive]);

  // Mobile only: the AI assistant is sheet content now (not a floating card),
  // so opening it lifts the sheet to half — same treatment as place/route —
  // instead of leaving it collapsed at peek where the chat would be unusable.
  useEffect(() => {
    if (showAssistant && !isDesktop) {
      setSnap("half");
      setSheetHeight(SNAP_POINTS.half);
    }
  }, [showAssistant, isDesktop]);

  // Same treatment for rail sub-panels: sheetMode stays "home" when a quick
  // action chip (or 已存地點管理 from the account menu) opens one, so the
  // sheetMode effect above never fires and the panel would otherwise be left
  // as a peek-height sliver with its header hidden.
  useEffect(() => {
    if (railContentActive && !isDesktop) {
      setSnap("half");
      setSheetHeight(SNAP_POINTS.half);
    }
  }, [railContentActive, isDesktop]);

  // Opening the step list mid-navigation lifts the mobile sheet to half.
  useEffect(() => {
    if (isNavigating && stepListOpen) {
      setSnap("half");
      setSheetHeight(SNAP_POINTS.half);
    }
  }, [isNavigating, stepListOpen]);

  // Coach marks' 2nd step targets the a11y quick-action chip, which sits well
  // below the fold at peek height (content there doesn't even scroll — only
  // dragging does). Without this the spotlight lands on a clipped/off-screen
  // rect and the tour looks broken. Same treatment as the other panel lifts.
  useEffect(() => {
    if (coachMarksActive && !isDesktop) {
      setSnap("half");
      setSheetHeight(SNAP_POINTS.half);
    }
  }, [coachMarksActive, isDesktop]);

  const snapToNearest = useCallback((ratio: number) => {
    const points = [SNAP_POINTS.peek, SNAP_POINTS.half, SNAP_POINTS.full];
    let closest = points[0];
    let minDist = Math.abs(ratio - points[0]);
    for (const p of points) {
      const dist = Math.abs(ratio - p);
      if (dist < minDist) {
        minDist = dist;
        closest = p;
      }
    }
    setSheetHeight(closest);
    if (closest === SNAP_POINTS.peek) setSnap("peek");
    else if (closest === SNAP_POINTS.half) setSnap("half");
    else setSnap("full");
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      startY.current = e.clientY;
      startHeight.current = sheetHeight;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [sheetHeight],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dy = startY.current - e.clientY;
      const vh = window.innerHeight;
      const newRatio = Math.max(
        0.08,
        Math.min(0.95, startHeight.current + dy / vh),
      );
      setSheetHeight(newRatio);
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    snapToNearest(sheetHeight);
  }, [isDragging, sheetHeight, snapToNearest]);

  const handleRailClick = useCallback(
    (panel: RailPanel) => {
      if (isNavigating) {
        requestNavExit(panel === "route" ? "plan" : panel);
        return;
      }
      if (collapsed) {
        setCollapsed(false);
        if (panel === "route") {
          setSheetMode("plan");
        } else {
          if (modePanelActive) {
            setSheetMode("home");
            setComputeRoutes(null);
            setRouteA11y([]);
            setRouteSelect(null);
            setInfoShow({ isOpen: false, kind: null });
            setSearchPlace(null);
          }
          setActiveRailPanel(panel);
        }
        setMoreOpen(false);
        return;
      }
      if (panel === "route") {
        setSheetMode("plan");
        return;
      }
      // Re-clicking the active item keeps the panel open — closing on the
      // second click read as a bug (close lives on the X / collapse toggle).
      // showAssistant has to re-run it though: the AI assistant is painted
      // over the panel, so clicking the already-"active" rail item is the
      // user asking to get back to it, and skipping the call would leave
      // chatOpen set and the click looking broken.
      if (activeRailPanel !== panel || modePanelActive || showAssistant) {
        // Reset to home mode if we were in a mode panel
        if (modePanelActive) {
          setSheetMode("home");
          setComputeRoutes(null);
          setRouteA11y([]);
          setRouteSelect(null);
          setInfoShow({ isOpen: false, kind: null });
          setSearchPlace(null);
        }
        setActiveRailPanel(panel);
      }
      setMoreOpen(false);
    },
    [
      activeRailPanel,
      modePanelActive,
      showAssistant,
      collapsed,
      setCollapsed,
      setActiveRailPanel,
      setSheetMode,
      setComputeRoutes,
      setRouteA11y,
      setRouteSelect,
      setInfoShow,
      setSearchPlace,
      isNavigating,
      requestNavExit,
    ],
  );

  // showAssistant must win over any rail highlight — otherwise the rail keeps
  // showing 搜尋 (or whatever was active before) lit up while the panel is
  // actually displaying the AI assistant, which is exactly the "rail says one
  // thing, content shows another" desync this refactor is meant to eliminate.
  // Shared by the main rail and the 更多 flyout so the two can't drift.
  const isRailItemActive = useCallback(
    (id: RailPanel) =>
      !modePanelActive && !showAssistant && activeRailPanel === id,
    [modePanelActive, showAssistant, activeRailPanel],
  );

  const handlePanelClose = useCallback(() => {
    if (isNavigating) {
      setStepListOpen(false);
      return;
    }
    if (showAssistant) {
      // Leaving assistant view only closes the chat — whatever sheetMode /
      // activeRailPanel was showing underneath stays put, so "back" from AI
      // returns to the same search/place/route view the user had open.
      setChatOpen(false);
      return;
    }
    if (modePanelActive) {
      setSheetMode("home");
      setActiveRailPanel("search");
      setComputeRoutes(null);
      setRouteA11y([]);
      setRouteSelect(null);
      setInfoShow({ isOpen: false, kind: null });
      setSearchPlace(null);
    } else if (railContentActive) {
      // Back out one level to the search home view — the same destination as
      // mobile's back button. Fully closing the desktop panel stays with the
      // collapse toggle, so "none" doesn't mean two different things on the
      // two breakpoints (mobile has no way to reopen a closed panel).
      setActiveRailPanel("search");
    } else {
      setActiveRailPanel("none");
    }
  }, [
    modePanelActive,
    railContentActive,
    showAssistant,
    setChatOpen,
    setSheetMode,
    setActiveRailPanel,
    setComputeRoutes,
    setRouteA11y,
    setRouteSelect,
    setInfoShow,
    setSearchPlace,
    isNavigating,
    setStepListOpen,
  ]);

  return (
    <>
      {/* ======= Mobile: Bottom Sheet (unchanged) ======= */}
      <div
        className={cn(
          "block lg:hidden fixed inset-x-0 bottom-0 z-(--z-drawer-panel) pointer-events-none",
          navHidesChrome && "hidden",
        )}
        aria-hidden={isDesktop}
        inert={isDesktop}
      >
        <motion.div
          ref={containerRef}
          className="pointer-events-auto bg-background rounded-t-3xl shadow-2xl border-t border-border/50 flex flex-col overflow-hidden"
          style={{ height: `${sheetHeight * 100}dvh` }}
          animate={
            isDragging ? undefined : { height: `${sheetHeight * 100}dvh` }
          }
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Drag Handle */}
          {/* py-4 keeps the grab target ≥32px tall for users with limited
              fine motor control. */}
          <div
            className="flex justify-center py-4 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Mobile Header — hidden at peek (map-first) and during plan / route / navigation */}
          {!atPeek &&
            sheetMode !== "plan" &&
            sheetMode !== "route" &&
            sheetMode !== "navigation" && (
              <div className="flex items-center justify-between gap-2 px-4 pb-2 min-h-11">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* The AI assistant, or a quick-action chip / 已存地點管理,
                      replaced the home view — mobile has no rail to show an
                      active indicator on and the panels render with
                      hideHeader, so this is the only way back. Sized to the
                      44px touch target the rest of the app holds to; the row
                      reserves that height in every state so swapping the
                      icon for the button doesn't jog the layout. */}
                  {showAssistant || railContentActive ? (
                    <button
                      type="button"
                      onClick={handlePanelClose}
                      aria-label={t("back")}
                      className="-ml-2 h-11 w-11 shrink-0 flex items-center justify-center rounded-full hover:bg-muted transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  ) : (
                    <Accessibility className="h-5 w-5 shrink-0 text-primary" />
                  )}
                  <h1 className="text-base font-bold flex items-center gap-1.5 min-w-0 truncate">
                    {showAssistant ? (
                      <>
                        <BotMessageSquare className="h-5 w-5 shrink-0 text-primary" />
                        <span className="truncate">{t("assist")}</span>
                      </>
                    ) : railContentActive ? (
                      <PanelTitle />
                    ) : (
                      t("title")
                    )}
                  </h1>
                </div>
                <AccountLogin />
              </div>
            )}

          {/* Mobile Content — overflow hidden at peek so users drag the
              sheet up instead of scrolling within a tiny sliver. Tapping
              the content area at peek lifts the sheet to half. */}
          <div
            className={cn(
              "flex-1 overflow-x-hidden pb-safe",
              showAssistant ? "overflow-hidden px-0" : "px-4",
              atPeek && !showAssistant
                ? "overflow-y-hidden"
                : "overflow-y-auto",
            )}
            onClick={
              atPeek && sheetMode === "home" && !showAssistant
                ? () => {
                    setSnap("half");
                    setSheetHeight(SNAP_POINTS.half);
                  }
                : undefined
            }
          >
            {showAssistant ? (
              <AIChatBot active={!isDesktop} />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={modePanelActive ? sheetMode : activeRailPanel}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <MobileSheetContent />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>

      {/* ======= Desktop: Dual-layer sidebar ======= */}
      <div
        className="hidden lg:block fixed inset-0 z-(--z-drawer-panel) pointer-events-none"
        aria-hidden={!isDesktop}
        inert={!isDesktop}
      >
        {/* --- Layer 1: Icon Rail (always visible; collapse only hides Layer 2,
             navigation hands the whole screen to the HUD) --- */}
        <nav
          aria-label={t("quickActions")}
          className={cn(
            "pointer-events-auto fixed left-3 top-3 bottom-3 w-[56px] bg-background/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 flex flex-col items-center py-3 gap-1 z-(--z-drawer-rail)",
            isNavigating && "hidden",
          )}
        >
          {/* Logo — the real app icon (public/logo.png: pin + wheelchair on
              blue), now shown in exactly one place instead of being repeated
              inside every search field (that's a plain Search icon now, see
              PlaceInput.tsx). AI 助理 is NOT a rail item (see
              MapControlsWrapper.tsx) — it's an independent floating button
              next to SOS/locate, not living in this fixed 56px column. */}
          <div
            className="flex items-center justify-center h-9 w-9 mb-2 rounded-xl overflow-hidden shrink-0"
            role="img"
            aria-label={t("title")}
          >
            <Image src="/logo.png" alt="" width={36} height={36} priority />
          </div>

          {/* Divider */}
          <div className="w-8 h-px bg-border/50 mb-1" />

          {/* Main rail items */}
          {RAIL_ITEMS.map((item) => {
            const isActive = isRailItemActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-label={t(item.labelKey)}
                aria-pressed={isActive}
                onClick={() => handleRailClick(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all",
                  "hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                  isActive
                    ? "bg-primary/10 shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.Icon
                  className={cn("h-5 w-5", isActive ? item.color : "")}
                />
                <span className="text-[9px] mt-0.5 leading-none font-medium truncate max-w-[48px]">
                  {t(item.labelKey)}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="rail-indicator"
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-8 h-px bg-border/50 my-1" />

          {/* More button + flyout */}
          <div className="relative">
            <button
              type="button"
              aria-label={t("railMore")}
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                "flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all",
                "hover:bg-muted text-muted-foreground hover:text-foreground",
                "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
                moreOpen && "bg-muted",
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[9px] mt-0.5 leading-none font-medium">
                {t("railMore")}
              </span>
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-[52px] bottom-0 bg-background/95 backdrop-blur-md rounded-xl shadow-xl border border-border/50 p-1.5 min-w-[140px] z-(--z-drawer-rail)"
                >
                  {RAIL_MORE_ITEMS.map((item) => {
                    const isActive = isRailItemActive(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleRailClick(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                          "hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary",
                          isActive
                            ? "bg-primary/10 font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        <item.Icon
                          className={cn("h-4 w-4 shrink-0", item.color)}
                        />
                        {t(item.labelKey)}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Account login at bottom */}
          <div className="mb-1">
            <AccountLogin />
          </div>
        </nav>

        {/* --- Layer 2: Content Panel --- */}
        <AnimatePresence>
          {(isNavigating ? stepListOpen : !collapsed && panelOpen) && (
            <motion.div
              key="desktop-panel"
              role="region"
              aria-label={t("title")}
              className={cn(
                "pointer-events-auto fixed bottom-3 w-[380px] bg-background/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden z-(--z-drawer-panel)",
                // The rail is hidden mid-navigation and the HUD banner owns
                // the top strip, so the step list hugs the left edge below it.
                isNavigating ? "left-3 top-[140px]" : "left-[68px] top-3",
              )}
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <h2 className="text-sm font-bold flex items-center gap-1.5">
                  {showAssistant ? (
                    <>
                      <BotMessageSquare className="h-4 w-4 text-primary" />
                      {t("assist")}
                    </>
                  ) : (
                    <PanelTitle />
                  )}
                </h2>
                {/* Back when there's a level to go back to (assistant or a
                    rail sub-panel over the search view), close when this is
                    the top level — the icon has to match where the click
                    actually lands, see handlePanelClose. */}
                <button
                  type="button"
                  onClick={handlePanelClose}
                  className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label={
                    showAssistant || railContentActive ? t("back") : t("close")
                  }
                >
                  {showAssistant || railContentActive ? (
                    <ChevronLeft className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              {/* Panel content */}
              <div
                className={cn(
                  "flex-1 overflow-y-auto overflow-x-hidden",
                  showAssistant ? "overflow-hidden p-0" : "p-4",
                )}
              >
                {showAssistant ? (
                  <AIChatBot active={isDesktop} />
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={modePanelActive ? sheetMode : activeRailPanel}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.12 }}
                    >
                      <DesktopPanelContent />
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Collapse/Expand toggle: hides the content panel, icons stay --- */}
        {panelOpen && !isNavigating && (
          <button
            type="button"
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "pointer-events-auto fixed top-1/2 -translate-y-1/2 z-(--z-drawer-rail) h-12 w-6 flex items-center justify-center",
              "bg-background border border-border/50 shadow-lg rounded-r-lg border-l-0",
              "hover:bg-muted hover:shadow-xl transition-all duration-300",
              !collapsed ? "left-[456px]" : "left-[64px]",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Navigation exit confirmation dialog */}
      <ExitNavDialog />
    </>
  );
}

// --- Panel title based on active panel ---
function PanelTitle() {
  const { t } = useAppTranslation();
  const { sheetMode, activeRailPanel } = useMapStore(
    useShallow((s) => ({
      sheetMode: s.sheetMode,
      activeRailPanel: s.activeRailPanel,
    })),
  );

  const modePanelActive = MODE_PANELS.has(sheetMode);
  if (modePanelActive) {
    switch (sheetMode) {
      case "place":
        return <>{t("title")}</>;
      case "plan":
        return (
          <>
            <Navigation className="h-4 w-4 text-blue-500" /> {t("planRoute")}
          </>
        );
      case "route":
        return (
          <>
            <Navigation className="h-4 w-4 text-blue-500" /> {t("route")}
          </>
        );
      case "navigation":
        return (
          <>
            <Navigation className="h-4 w-4 text-blue-500" />{" "}
            {t("navInstructions")}
          </>
        );
      case "station":
        return (
          <>
            <Accessibility className="h-4 w-4 text-accessibility" />{" "}
            {t("stationDetail")}
          </>
        );
    }
  }

  switch (activeRailPanel) {
    case "search":
      return (
        <>
          <Search className="h-4 w-4 text-primary" /> {t("railSearch")}
        </>
      );
    case "a11y":
      return (
        <>
          <Accessibility className="h-4 w-4 text-accessibility" />{" "}
          {t("accessibleTitle")}
        </>
      );
    case "bus":
      return (
        <>
          <Bus className="h-4 w-4 text-emerald-600" /> {t("busInfo")}
        </>
      );
    case "parking":
      return (
        <>
          <CircleParking className="h-4 w-4 text-indigo-500" /> {t("parking")}
        </>
      );
    case "saved":
      return (
        <>
          <Bookmark className="h-4 w-4 text-amber-500" /> {t("savedPlaces")}
        </>
      );
    case "environment":
      return (
        <>
          <Cloud className="h-4 w-4 text-sky-500" /> {t("environment")}
        </>
      );
    case "hazard":
      return (
        <>
          <AlertTriangle className="h-4 w-4 text-amber-500" />{" "}
          {t("reportHazard")}
        </>
      );
    case "welfare":
      return (
        <>
          <Heart className="h-4 w-4 text-rose-500" /> {t("welfare")}
        </>
      );
    default:
      return <>{t("title")}</>;
  }
}

// --- Single source of truth for "which rail panel is showing" — shared by
// both desktop and mobile so a quick-action click has exactly one code path
// to render through, instead of desktop reading this switch while mobile
// fell back to HomeContent's own local subPanel copy of the same logic. ---
function RailPanelOrHome() {
  const { activeRailPanel, setActiveRailPanel } = useMapStore(
    useShallow((s) => ({
      activeRailPanel: s.activeRailPanel,
      setActiveRailPanel: s.setActiveRailPanel,
    })),
  );
  // Back out to the search home view, matching the header's back button —
  // "none" would close the whole panel on desktop and merely re-render the
  // same HomeContent on mobile.
  const closePanel = () => setActiveRailPanel("search");

  switch (activeRailPanel) {
    case "a11y":
      return <A11yPanel onClose={closePanel} hideHeader />;
    case "bus":
      return <BusPanel onClose={closePanel} hideHeader />;
    case "parking":
      return <ParkingPanel onClose={closePanel} hideHeader />;
    case "saved":
      return <SavedPlacesPanel onClose={closePanel} hideHeader />;
    case "environment":
      return <EnvironmentPanel onClose={closePanel} hideHeader />;
    case "hazard":
      return <HazardReportPanel onClose={closePanel} hideHeader />;
    case "welfare":
      return <WelfarePanel onClose={closePanel} hideHeader />;
    // "search" / "none" are the home view itself, and "route" only ever lands
    // here as a leftover from RoutePreviewHydrator once sheetMode has already
    // gone back to "home" — all three mean "no sub-panel". Keep this list in
    // sync with RAIL_CONTENT_PANELS.
    default:
      return <HomeContent />;
  }
}

// --- Desktop panel content switcher ---
function DesktopPanelContent() {
  const { sheetMode } = useMapStore(
    useShallow((s) => ({ sheetMode: s.sheetMode })),
  );

  const modePanelActive = MODE_PANELS.has(sheetMode);
  if (modePanelActive) {
    switch (sheetMode) {
      case "place":
        return <PlaceContent />;
      case "plan":
        return <RoutePlanContent />;
      case "route":
        return <RouteContent />;
      case "navigation":
        return <NavigationContent />;
      case "station":
        return <StationDetailContent />;
    }
  }

  return <RailPanelOrHome />;
}

// --- Mobile sheet content ---
function MobileSheetContent() {
  const { sheetMode } = useMapStore(
    useShallow((s) => ({ sheetMode: s.sheetMode })),
  );
  switch (sheetMode) {
    case "home":
      return <RailPanelOrHome />;
    case "place":
      return <PlaceContent />;
    case "plan":
      return <RoutePlanContent />;
    case "route":
      return <RouteContent />;
    case "navigation":
      return <NavigationContent />;
    case "station":
      return <StationDetailContent />;
    default:
      return <RailPanelOrHome />;
  }
}
