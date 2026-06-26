"use client";

import { ChevronLeft, ChevronRight, Pin, PinOff, Search } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import AccountLogin from "@/components/shared/AccountLogin";
import PlaceInput from "@/components/shared/PlaceInput";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import type { PlaceDetail } from "@/types";
import HomeContent from "./HomeContent";
import NavigationContent from "./NavigationContent";
import PlaceContent from "./PlaceContent";
import RouteContent from "./RouteContent";
import RoutePlanContent from "./RoutePlanContent";
import StationDetailContent from "./StationDetailContent";

const SNAP_POINTS = {
  peek: 0.12,
  half: 0.45,
  full: 0.92,
};

export default function BottomSheet() {
  const { t } = useAppTranslation();
  const {
    sheetMode,
    sidebarCollapsed: collapsed,
    setSidebarCollapsed: setCollapsed,
    drawerPinned: pinned,
    setDrawerPinned: setPinned,
    setSearchPlace,
    setInfoShow,
    setSheetMode,
    map,
  } = useMapStore();
  const [snap, setSnap] = useState<"peek" | "half" | "full">("half");
  const [sheetHeight, setSheetHeight] = useState(SNAP_POINTS.half);
  const [isDragging, setIsDragging] = useState(false);
  const [miniSearchOpen, setMiniSearchOpen] = useState(false);
  const [miniSearchInput, setMiniSearchInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

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

  const prevMode = useRef(sheetMode);
  useEffect(() => {
    if (prevMode.current !== sheetMode && collapsed) {
      setCollapsed(false);
    }
    prevMode.current = sheetMode;
  }, [sheetMode, collapsed, setCollapsed]);

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

  const handleMiniSearchSelect = useCallback(
    (placeDetail: PlaceDetail) => {
      setSearchPlace(placeDetail);
      if (placeDetail.kind === "place") {
        setInfoShow({
          isOpen: true,
          kind: "place",
          place: placeDetail.place,
        });
        if (map) map.flyTo({ center: [placeDetail.position.lng, placeDetail.position.lat] });
      } else if (placeDetail.kind === "coordinate") {
        setInfoShow({
          isOpen: true,
          kind: "coordinate",
          address: placeDetail.address,
          position: placeDetail.position,
        });
        if (map) map.flyTo({ center: [placeDetail.position.lng, placeDetail.position.lat] });
      }
      setSheetMode("place");
      setCollapsed(false);
      setMiniSearchOpen(false);
      setMiniSearchInput("");
    },
    [setSearchPlace, setInfoShow, map, setSheetMode, setCollapsed]
  );

  const togglePin = useCallback(() => {
    setPinned(!pinned);
    if (!pinned) {
      setCollapsed(false);
    }
  }, [pinned, setPinned, setCollapsed]);

  const panelWidth = 420;
  const panelGap = pinned ? 0 : 12;
  const panelLeft = pinned ? 0 : 12;

  return (
    <>
      {/* Mobile: Bottom Sheet */}
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

          {/* Mobile Header with Login */}
          <div className="flex items-center justify-between px-4 pb-2">
            <h1 className="text-base font-bold flex items-center gap-1.5">
              <Image src="/logo.webp" width={22} height={22} alt="" /> Accessible Taipei
            </h1>
            <AccountLogin />
          </div>

          {/* Content */}
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
                <SheetContent />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Desktop: Left Side Panel */}
      <div className="hidden lg:block fixed inset-0 z-40 pointer-events-none">
        {/* Collapse/Expand toggle — positioned independently */}
        {!pinned && (
          <button
            type="button"
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "pointer-events-auto fixed top-1/2 -translate-y-1/2 z-50 h-12 w-6 flex items-center justify-center",
              "bg-background border border-border/50 shadow-lg rounded-r-lg border-l-0",
              "hover:bg-muted hover:shadow-xl transition-all duration-300",
              collapsed ? "left-0" : `left-[${panelLeft + panelWidth + panelGap}px]`
            )}
            style={{ left: collapsed ? 0 : panelLeft + panelWidth }}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}

        {/* Collapsed: Floating mini search bar */}
        <AnimatePresence>
          {collapsed && !pinned && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="pointer-events-auto fixed top-3 left-3 z-50"
              role="search"
              aria-label={t("searchPlaceHolder")}
            >
              {miniSearchOpen ? (
                <div className="w-[340px] bg-background rounded-2xl shadow-2xl border border-border/50 overflow-visible">
                  <PlaceInput
                    className="border-none"
                    value={miniSearchInput}
                    onChange={(e) => setMiniSearchInput((e.target as HTMLInputElement).value)}
                    placeholder={t("searchPlaceHolder")}
                    onPlaceSelect={handleMiniSearchSelect}
                    hideIcon
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMiniSearchOpen(false);
                      setMiniSearchInput("");
                    }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label={t("close")}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setMiniSearchOpen(true)}
                  className="flex items-center gap-2.5 h-11 px-4 bg-background rounded-full shadow-lg border border-border/50 hover:shadow-xl hover:bg-muted/80 transition-all min-w-[200px]"
                  aria-label={t("searchPlaceHolder")}
                >
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">{t("searchPlaceHolder")}</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panel */}
        <motion.div
          role="navigation"
          aria-label={t("title")}
          className={cn(
            "pointer-events-auto absolute top-0 bottom-0 flex flex-col overflow-hidden",
            pinned
              ? "bg-background border-r border-border/50 shadow-xl"
              : "top-3 bottom-3 bg-background rounded-2xl shadow-2xl border border-border/50"
          )}
          style={{
            width: panelWidth,
            left: panelLeft,
          }}
          animate={{
            x: collapsed && !pinned ? -(panelWidth + panelLeft + 20) : 0,
            opacity: collapsed && !pinned ? 0 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Desktop Header with Login + Pin toggle */}
          <div className="flex items-center justify-between p-5 pb-3 border-b border-border/30">
            <h1 className="text-base font-bold flex items-center gap-1.5">
              <Image src="/logo.webp" width={22} height={22} alt="" /> Accessible Taipei
            </h1>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={togglePin}
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                  pinned
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted"
                )}
                aria-label={pinned ? t("unpinSidebar") : t("pinSidebar")}
                title={pinned ? t("unpinSidebar") : t("pinSidebar")}
              >
                {pinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
              </button>
              <AccountLogin />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={sheetMode}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                <SheetContent />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function SheetContent() {
  const { sheetMode } = useMapStore();
  switch (sheetMode) {
    case "home":
      return <HomeContent />;
    case "place":
      return <PlaceContent />;
    case "plan":
      return <RoutePlanContent />;
    case "route":
      return <RouteContent />;
    case "navigation":
      return <NavigationContent />;
    case "a11y":
      return <HomeContent />;
    case "station":
      return <StationDetailContent />;
    default:
      return <HomeContent />;
  }
}
