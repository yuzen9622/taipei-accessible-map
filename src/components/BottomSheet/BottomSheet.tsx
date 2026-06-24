"use client";

import { motion, AnimatePresence, useDragControls } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
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
      <div className="hidden lg:block fixed left-3 top-3 bottom-3 w-[420px] z-40 pointer-events-none">
        <div className="pointer-events-auto h-full bg-background/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-5">
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
        </div>
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
