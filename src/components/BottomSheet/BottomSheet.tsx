"use client";

import {
  Accessibility,
  AlertTriangle,
  Bookmark,
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

import { useCallback, useEffect, useRef, useState } from "react";
import AccountLogin from "@/components/shared/AccountLogin";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { RailPanel } from "@/stores/useMapStore";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";
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
  half: 0.45,
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
    color: "text-emerald-500",
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
    setIsNavigating,
  } = useMapStore();
  const stepListOpen = useNavStore((s) => s.stepListOpen);
  const setStepListOpen = useNavStore((s) => s.setStepListOpen);
  // Only the setter is needed — the sheet height drives the layout.
  const [, setSnap] = useState<"peek" | "half" | "full">("half");
  const [sheetHeight, setSheetHeight] = useState(SNAP_POINTS.half);
  const [isDragging, setIsDragging] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  // Whether the content panel (Layer 2) is open on desktop
  const modePanelActive = MODE_PANELS.has(sheetMode);
  const railPanelActive = !modePanelActive && activeRailPanel !== "none";
  const panelOpen = modePanelActive || railPanelActive;

  useEffect(() => {
    switch (sheetMode) {
      case "home":
      case "place":
      case "plan":
      case "route":
      case "a11y":
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

  // Opening the step list mid-navigation lifts the mobile sheet to half.
  useEffect(() => {
    if (isNavigating && stepListOpen) {
      setSnap("half");
      setSheetHeight(SNAP_POINTS.half);
    }
  }, [isNavigating, stepListOpen]);

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
      // Leaving the navigation panel must also stop the nav engine, otherwise
      // the camera keeps chasing the user behind the newly opened panel.
      if (isNavigating) setIsNavigating(false);
      // Picking anything from the icon rail while collapsed re-opens the panel.
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
      if (activeRailPanel !== panel || modePanelActive) {
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
      setIsNavigating,
    ],
  );

  const handlePanelClose = useCallback(() => {
    // Mid-navigation the panel is just the step list — closing it must not
    // end navigation.
    if (isNavigating) {
      setStepListOpen(false);
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
    } else {
      setActiveRailPanel("none");
    }
  }, [
    modePanelActive,
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

  // Map-first navigation: the HUD owns the screen; the sheet/panel only
  // reappears as the step list when requested from the HUD.
  const navHidesChrome = isNavigating && !stepListOpen;

  return (
    <>
      {/* ======= Mobile: Bottom Sheet (unchanged) ======= */}
      <div
        className={cn(
          "block lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none",
          navHidesChrome && "hidden",
        )}
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
          <div
            className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4 pb-2">
            <h1 className="text-base font-bold flex items-center gap-1.5">
              <Accessibility className="h-5 w-5 text-primary" />
              {t("title")}
            </h1>
            <AccountLogin />
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-safe">
            <AnimatePresence mode="wait">
              <motion.div
                key={sheetMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <MobileSheetContent />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ======= Desktop: Dual-layer sidebar ======= */}
      <div className="hidden lg:block fixed inset-0 z-40 pointer-events-none">
        {/* --- Layer 1: Icon Rail (always visible; collapse only hides Layer 2,
             navigation hands the whole screen to the HUD) --- */}
        <nav
          aria-label={t("quickActions")}
          className={cn(
            "pointer-events-auto fixed left-3 top-3 bottom-3 w-[56px] bg-background/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 flex flex-col items-center py-3 gap-1 z-50",
            isNavigating && "hidden",
          )}
        >
          {/* Logo */}
          <div className="flex flex-col items-center justify-center h-12 w-12 mb-1">
            <Accessibility className="h-6 w-6 text-primary" />
            <span className="text-[6px] font-bold leading-tight text-center text-foreground/80 mt-0.5">
              無障礙
              <br />
              智慧導航
            </span>
          </div>

          {/* Divider */}
          <div className="w-8 h-px bg-border/50 mb-1" />

          {/* Main rail items */}
          {RAIL_ITEMS.map((item) => {
            const isActive = !modePanelActive && activeRailPanel === item.id;
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
                  className="absolute left-[52px] bottom-0 bg-background/95 backdrop-blur-md rounded-xl shadow-xl border border-border/50 p-1.5 min-w-[140px] z-50"
                >
                  {RAIL_MORE_ITEMS.map((item) => {
                    const isActive =
                      !modePanelActive && activeRailPanel === item.id;
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
                "pointer-events-auto fixed bottom-3 w-[380px] bg-background/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden z-40",
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
                  <PanelTitle />
                </h2>
                <button
                  type="button"
                  onClick={handlePanelClose}
                  className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label={t("close")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Collapse/Expand toggle: hides the content panel, icons stay --- */}
        <button
          type="button"
          aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "pointer-events-auto fixed top-1/2 -translate-y-1/2 z-50 h-12 w-6 flex items-center justify-center",
            "bg-background border border-border/50 shadow-lg rounded-r-lg border-l-0",
            "hover:bg-muted hover:shadow-xl transition-all duration-300",
            !collapsed && panelOpen ? "left-[456px]" : "left-[64px]",
            isNavigating && "hidden",
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </>
  );
}

// --- Panel title based on active panel ---
function PanelTitle() {
  const { t } = useAppTranslation();
  const { sheetMode, activeRailPanel } = useMapStore();

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
            <Accessibility className="h-4 w-4 text-emerald-500" />{" "}
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
          <Accessibility className="h-4 w-4 text-emerald-500" />{" "}
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

// --- Desktop panel content switcher ---
function DesktopPanelContent() {
  const { sheetMode, activeRailPanel, setActiveRailPanel } = useMapStore();

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

  const noop = () => setActiveRailPanel("none");

  switch (activeRailPanel) {
    case "search":
      return <HomeContent />;
    case "a11y":
      return <A11yPanel hideHeader />;
    case "bus":
      return <BusPanel onClose={noop} hideHeader />;
    case "parking":
      return <ParkingPanel onClose={noop} hideHeader />;
    case "saved":
      return <SavedPlacesPanel onClose={noop} hideHeader />;
    case "environment":
      return <EnvironmentPanel onClose={noop} hideHeader />;
    case "hazard":
      return <HazardReportPanel onClose={noop} hideHeader />;
    case "welfare":
      return <WelfarePanel onClose={noop} hideHeader />;
    default:
      return <HomeContent />;
  }
}

// --- Mobile sheet content (same as before) ---
function MobileSheetContent() {
  const { sheetMode } = useMapStore();
  switch (sheetMode) {
    case "home":
      return <HomeContent />;
    case "a11y":
      return <A11yPanel hideHeader />;
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
      return <HomeContent />;
  }
}
