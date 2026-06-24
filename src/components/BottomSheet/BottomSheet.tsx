"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import AccountLogin from "@/components/shared/AccountLogin";
import { cn } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import HomeContent from "./HomeContent";
import NavigationContent from "./NavigationContent";
import PlaceContent from "./PlaceContent";
import RouteContent from "./RouteContent";

const SNAP_POINTS = {
  peek: 0.12,
  half: 0.45,
  full: 0.92,
};

export default function BottomSheet() {
  const { sheetMode } = useMapStore();
  const [snap, setSnap] = useState<"peek" | "half" | "full">("half");
  const [sheetHeight, setSheetHeight] = useState(SNAP_POINTS.half);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    switch (sheetMode) {
      case "home":
        setSnap("half");
        setSheetHeight(SNAP_POINTS.half);
        break;
      case "place":
        setSnap("half");
        setSheetHeight(SNAP_POINTS.half);
        break;
      case "route":
        setSnap("half");
        setSheetHeight(SNAP_POINTS.half);
        break;
      case "navigation":
        setSnap("peek");
        setSheetHeight(SNAP_POINTS.peek);
        break;
      case "a11y":
        setSnap("half");
        setSheetHeight(SNAP_POINTS.half);
        break;
    }
  }, [sheetMode]);

  const prevMode = useRef(sheetMode);
  useEffect(() => {
    if (prevMode.current !== sheetMode && collapsed) {
      setCollapsed(false);
    }
    prevMode.current = sheetMode;
  }, [sheetMode, collapsed]);

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
            <h1 className="text-base font-bold">♿ Accessible Taipei</h1>
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
        <button
          type="button"
          aria-label={collapsed ? "展開側邊欄" : "收合側邊欄"}
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "pointer-events-auto fixed top-1/2 -translate-y-1/2 z-50 h-12 w-6 flex items-center justify-center",
            "bg-background border border-border/50 shadow-lg rounded-r-lg border-l-0",
            "hover:bg-muted hover:shadow-xl transition-all duration-300",
            collapsed ? "left-0" : "left-[438px]"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Panel */}
        <motion.div
          className="pointer-events-auto absolute left-3 top-3 bottom-3 w-[420px] bg-background/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden"
          animate={{
            x: collapsed ? -440 : 0,
            opacity: collapsed ? 0 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Desktop Header with Login */}
          <div className="flex items-center justify-between p-5 pb-3 border-b border-border/30">
            <h1 className="text-base font-bold">♿ Accessible Taipei</h1>
            <AccountLogin />
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
    case "route":
      return <RouteContent />;
    case "navigation":
      return <NavigationContent />;
    case "a11y":
      return <HomeContent />;
    default:
      return <HomeContent />;
  }
}
