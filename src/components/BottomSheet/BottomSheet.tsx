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
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import AccountLogin from "@/components/shared/AccountLogin";
import PlaceInput from "@/components/shared/PlaceInput";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { RailPanel } from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
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
  { id: "route", Icon: Navigation, labelKey: "railRoute", color: "text-blue-500" },
  { id: "a11y", Icon: Accessibility, labelKey: "railA11y", color: "text-emerald-500" },
  { id: "bus", Icon: Bus, labelKey: "railBus", color: "text-emerald-600" },
  { id: "parking", Icon: CircleParking, labelKey: "railParking", color: "text-indigo-500" },
  { id: "saved", Icon: Bookmark, labelKey: "savedPlaces", color: "text-amber-500" },
];

const RAIL_MORE_ITEMS: RailItem[] = [
  { id: "environment", Icon: Cloud, labelKey: "environment", color: "text-sky-500" },
  { id: "hazard", Icon: AlertTriangle, labelKey: "reportHazard", color: "text-amber-500" },
  { id: "welfare", Icon: Heart, labelKey: "welfare", color: "text-rose-500" },
];

// --- Mode-driven panels: shown via sheetMode, override rail panels ---
const MODE_PANELS = new Set(["place", "plan", "route", "navigation", "station"]);

export default function BottomSheet() {
  const { t } = useAppTranslation();
  const {
    sheetMode,
    sidebarCollapsed: collapsed,
    setSidebarCollapsed: setCollapsed,
    activeRailPanel,
    setActiveRailPanel,
    setSearchPlace,
    setInfoShow,
    setSheetMode,
    map,
  } = useMapStore();
  const [snap, setSnap] = useState<"peek" | "half" | "full">("half");
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
    [sheetHeight]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dy = startY.current - e.clientY;
      const vh = window.innerHeight;
      const newRatio = Math.max(0.08, Math.min(0.95, startHeight.current + dy / vh));
      setSheetHeight(newRatio);
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    snapToNearest(sheetHeight);
  }, [isDragging, sheetHeight, snapToNearest]);

  const handleRailClick = useCallback(
    (panel: RailPanel) => {
      if (panel === "route") {
        setSheetMode("plan");
        return;
      }
      // If clicking the already-active panel, close it
      if (activeRailPanel === panel && !modePanelActive) {
        setActiveRailPanel("none");
      } else {
        // Reset to home mode if we were in a mode panel
        if (modePanelActive) {
          setSheetMode("home");
        }
        setActiveRailPanel(panel);
      }
      setMoreOpen(false);
    },
    [activeRailPanel, modePanelActive, setActiveRailPanel, setSheetMode]
  );

  const handlePanelClose = useCallback(() => {
    if (modePanelActive) {
      setSheetMode("home");
      setActiveRailPanel("search");
    } else {
      setActiveRailPanel("none");
    }
  }, [modePanelActive, setSheetMode, setActiveRailPanel]);

  return (
    <>
      {/* ======= Mobile: Bottom Sheet (unchanged) ======= */}
      <div className="block lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <motion.div
          ref={containerRef}
          className="pointer-events-auto bg-background rounded-t-3xl shadow-2xl border-t border-border/50 flex flex-col overflow-hidden"
          style={{ height: `${sheetHeight * 100}dvh` }}
          animate={isDragging ? undefined : { height: `${sheetHeight * 100}dvh` }}
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
              <Image src="/logo.webp" width={22} height={22} alt="" /> Accessible Taipei
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

        {/* --- Layer 1: Icon Rail (always visible unless fully collapsed) --- */}
        <motion.nav
          aria-label={t("quickActions")}
          className="pointer-events-auto fixed left-3 top-3 bottom-3 w-[56px] bg-background/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/50 flex flex-col items-center py-3 gap-1 z-50"
          animate={{
            x: collapsed ? -70 : 0,
            opacity: collapsed ? 0 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center h-10 w-10 mb-2">
            <Image src="/logo.webp" width={28} height={28} alt="Accessible Taipei" />
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
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.Icon className={cn("h-5 w-5", isActive ? item.color : "")} />
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
                moreOpen && "bg-muted"
              )}
            >
              <Menu className="h-5 w-5" />
              <span className="text-[9px] mt-0.5 leading-none font-medium">{t("railMore")}</span>
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
                    const isActive = !modePanelActive && activeRailPanel === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleRailClick(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                          "hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary",
                          isActive ? "bg-primary/10 font-medium" : "text-muted-foreground"
                        )}
                      >
                        <item.Icon className={cn("h-4 w-4 shrink-0", item.color)} />
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
        </motion.nav>

        {/* --- Layer 2: Content Panel --- */}
        <AnimatePresence>
          {!collapsed && panelOpen && (
            <motion.div
              key="desktop-panel"
              role="region"
              aria-label={t("title")}
              className="pointer-events-auto fixed left-[68px] top-3 bottom-3 w-[380px] bg-background/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden z-40"
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

        {/* --- Collapse/Expand toggle --- */}
        <button
          type="button"
          aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "pointer-events-auto fixed top-1/2 -translate-y-1/2 z-50 h-12 w-6 flex items-center justify-center",
            "bg-background border border-border/50 shadow-lg rounded-r-lg border-l-0",
            "hover:bg-muted hover:shadow-xl transition-all duration-300",
            collapsed
              ? "left-0"
              : panelOpen
                ? "left-[456px]"
                : "left-[64px]"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* --- Collapsed: Floating mini search bar --- */}
        <AnimatePresence>
          {collapsed && <CollapsedSearch />}
        </AnimatePresence>
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
      case "place": return <>{t("title")}</>;
      case "plan": return <><Navigation className="h-4 w-4 text-blue-500" /> {t("planRoute")}</>;
      case "route": return <><Navigation className="h-4 w-4 text-blue-500" /> {t("route")}</>;
      case "navigation": return <><Navigation className="h-4 w-4 text-blue-500" /> {t("startNavigation")}</>;
      case "station": return <><Accessibility className="h-4 w-4 text-emerald-500" /> {t("stationDetail")}</>;
    }
  }

  switch (activeRailPanel) {
    case "search": return <><Search className="h-4 w-4 text-primary" /> {t("railSearch")}</>;
    case "a11y": return <><Accessibility className="h-4 w-4 text-emerald-500" /> {t("accessibleTitle")}</>;
    case "bus": return <><Bus className="h-4 w-4 text-emerald-600" /> {t("busInfo")}</>;
    case "parking": return <><CircleParking className="h-4 w-4 text-indigo-500" /> {t("parking")}</>;
    case "saved": return <><Bookmark className="h-4 w-4 text-amber-500" /> {t("savedPlaces")}</>;
    case "environment": return <><Cloud className="h-4 w-4 text-sky-500" /> {t("environment")}</>;
    case "hazard": return <><AlertTriangle className="h-4 w-4 text-amber-500" /> {t("reportHazard")}</>;
    case "welfare": return <><Heart className="h-4 w-4 text-rose-500" /> {t("welfare")}</>;
    default: return <>{t("title")}</>;
  }
}

// --- Desktop panel content switcher ---
function DesktopPanelContent() {
  const { sheetMode, activeRailPanel, setActiveRailPanel } = useMapStore();

  const modePanelActive = MODE_PANELS.has(sheetMode);
  if (modePanelActive) {
    switch (sheetMode) {
      case "place": return <PlaceContent />;
      case "plan": return <RoutePlanContent />;
      case "route": return <RouteContent />;
      case "navigation": return <NavigationContent />;
      case "station": return <StationDetailContent />;
    }
  }

  const noop = () => setActiveRailPanel("none");

  switch (activeRailPanel) {
    case "search": return <HomeContent />;
    case "a11y": return <HomeContent />;
    case "bus": return <BusPanel onClose={noop} />;
    case "parking": return <ParkingPanel onClose={noop} />;
    case "saved": return <SavedPlacesPanel onClose={noop} />;
    case "environment": return <EnvironmentPanel onClose={noop} />;
    case "hazard": return <HazardReportPanel onClose={noop} />;
    case "welfare": return <WelfarePanel onClose={noop} />;
    default: return <HomeContent />;
  }
}

// --- Mobile sheet content (same as before) ---
function MobileSheetContent() {
  const { sheetMode } = useMapStore();
  switch (sheetMode) {
    case "home":
    case "a11y":
      return <HomeContent />;
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

// --- Collapsed mini search (extracted for readability) ---
function CollapsedSearch() {
  const { t } = useAppTranslation();
  const { setSearchPlace, setInfoShow, setSheetMode, setSidebarCollapsed, map } = useMapStore();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const handleSelect = useCallback(
    (placeDetail: PlaceDetail) => {
      setSearchPlace(placeDetail);
      if (placeDetail.kind === "place") {
        setInfoShow({ isOpen: true, kind: "place", place: placeDetail.place });
        if (map) map.flyTo({ center: [placeDetail.position.lng, placeDetail.position.lat] });
      } else if (placeDetail.kind === "coordinate") {
        setInfoShow({ isOpen: true, kind: "coordinate", address: placeDetail.address, position: placeDetail.position });
        if (map) map.flyTo({ center: [placeDetail.position.lng, placeDetail.position.lat] });
      }
      setSheetMode("place");
      setSidebarCollapsed(false);
      setOpen(false);
      setInput("");
    },
    [setSearchPlace, setInfoShow, map, setSheetMode, setSidebarCollapsed]
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="pointer-events-auto fixed top-3 left-3 z-50"
      role="search"
      aria-label={t("searchPlaceHolder")}
    >
      {open ? (
        <div className="w-[340px] bg-background/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/50 overflow-visible">
          <PlaceInput
            className="border-none"
            value={input}
            onChange={(e) => setInput((e.target as HTMLInputElement).value)}
            placeholder={t("searchPlaceHolder")}
            onPlaceSelect={handleSelect}
            hideIcon
          />
          <button
            type="button"
            onClick={() => { setOpen(false); setInput(""); }}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
            aria-label={t("close")}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 h-11 px-4 bg-background/95 backdrop-blur-md rounded-full shadow-lg border border-border/50 hover:shadow-xl hover:bg-muted/80 transition-all min-w-[200px]"
          aria-label={t("searchPlaceHolder")}
        >
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground truncate">{t("searchPlaceHolder")}</span>
        </button>
      )}
    </motion.div>
  );
}
