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
import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import AccountLogin from "@/components/shared/AccountLogin";
import useIsDesktop from "@/hook/useIsDesktop";
import { useAppTranslation } from "@/i18n/client";
import { cn } from "@/lib/utils";
import type { RailPanel } from "@/stores/useMapStore";
import useMapStore from "@/stores/useMapStore";
import useNavStore from "@/stores/useNavStore";
import useOnboardingStore from "@/stores/useOnboardingStore";
import HomeContent from "./HomeContent";
import {
  A11yPanelSkeleton,
  BusPanelSkeleton,
  ChatSkeleton,
  EnvironmentSkeleton,
  HazardReportSkeleton,
  NavigationSkeleton,
  ParkingPanelSkeleton,
  PlaceSkeleton,
  RouteContentSkeleton,
  RoutePlanSkeleton,
  SavedPlacesSkeleton,
  StationDetailSkeleton,
  WelfareSkeleton,
} from "./PanelSkeletons";

const AIChatBot = dynamic(() => import("@/components/AIChatBot"), {
  loading: () => <ChatSkeleton />,
  ssr: false,
});
const ExitNavDialog = dynamic(
  () => import("@/components/Navigation/ExitNavDialog"),
  { ssr: false },
);
const A11yPanel = dynamic(() => import("./A11yPanel"), {
  loading: () => <A11yPanelSkeleton />,
  ssr: false,
});
const BusPanel = dynamic(() => import("./BusPanel"), {
  loading: () => <BusPanelSkeleton />,
  ssr: false,
});
const EnvironmentPanel = dynamic(() => import("./EnvironmentPanel"), {
  loading: () => <EnvironmentSkeleton />,
  ssr: false,
});
const HazardReportPanel = dynamic(() => import("./HazardReportPanel"), {
  loading: () => <HazardReportSkeleton />,
  ssr: false,
});
const ParkingPanel = dynamic(() => import("./ParkingPanel"), {
  loading: () => <ParkingPanelSkeleton />,
  ssr: false,
});
const SavedPlacesPanel = dynamic(() => import("./SavedPlacesPanel"), {
  loading: () => <SavedPlacesSkeleton />,
  ssr: false,
});
const WelfarePanel = dynamic(() => import("./WelfarePanel"), {
  loading: () => <WelfareSkeleton />,
  ssr: false,
});
const PlaceContent = dynamic(() => import("./PlaceContent"), {
  loading: () => <PlaceSkeleton />,
  ssr: false,
});
const RoutePlanContent = dynamic(() => import("./RoutePlanContent"), {
  loading: () => <RoutePlanSkeleton />,
  ssr: false,
});
const RouteContent = dynamic(() => import("./RouteContent"), {
  loading: () => <RouteContentSkeleton />,
  ssr: false,
});
const NavigationContent = dynamic(() => import("./NavigationContent"), {
  loading: () => <NavigationSkeleton />,
  ssr: false,
});
const StationDetailContent = dynamic(() => import("./StationDetailContent"), {
  loading: () => <StationDetailSkeleton />,
  ssr: false,
});

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

// §6.2 revision: "route" is dropped from the rail entirely (not even into
// "更多") — HomeContent already has its own "規劃路線" entry right below the
// search bar, so a second route-planning door on the rail duplicated that
// responsibility instead of adding one. Only the two lowest-frequency
// actions (hazard report, welfare directory) move into RAIL_MORE_ITEMS;
// everything else people reach for while looking at the map stays one tap
// away on the visible rail.
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
    id: "environment",
    Icon: Cloud,
    labelKey: "environment",
    color: "text-sky-500",
  },
];

const RAIL_MORE_ITEMS: RailItem[] = [
  {
    id: "hazard",
    Icon: AlertTriangle,
    labelKey: "reportHazard",
    color: "text-amber-500",
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

// Mode panels whose content component renders its own back/close + title
// header (PlaceContent, RoutePlanContent, RouteContent, StationDetailContent
// each have a "{/* Header */}" block at the top of their JSX) — the shared
// desktop chrome header below must stay hidden for these, exactly like the
// mobile header already does via its own sheetMode check, or the two stack
// into a visible double header. "navigation" is deliberately excluded:
// NavigationContent has no header of its own, so the shared chrome one is
// the only one and must stay.
const MODE_PANELS_WITH_OWN_HEADER = new Set([
  "place",
  "plan",
  "route",
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
    mobileSheetSnap,
    setMobileSheetSnap,
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
      mobileSheetSnap: s.mobileSheetSnap,
      setMobileSheetSnap: s.setMobileSheetSnap,
    })),
  );
  const isDesktop = useIsDesktop();
  const coachMarksActive = useOnboardingStore((s) => s.coachMarksActive);
  const stepListOpen = useNavStore((s) => s.stepListOpen);
  const setStepListOpen = useNavStore((s) => s.setStepListOpen);
  const [sheetHeight, setSheetHeight] = useState(SNAP_POINTS.peek);
  const [isDragging, setIsDragging] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreFlyoutRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const mobileContentScrollRef = useRef<HTMLDivElement>(null);
  const desktopContentScrollRef = useRef<HTMLDivElement>(null);

  // `HomeContent` (and the search input inside it) used to be rendered
  // directly from both `MobileSheetContent` and `DesktopPanelContent`,
  // producing two separately-mounted copies (one always `inert`) — same as
  // every other rail panel here, but this one holds a real form control, so
  // "there are two `<input>`s with the same accessible name in the DOM" was
  // an actual latent risk, not just duplicated markup. It's mounted once
  // here and portaled into whichever of these two marker slots is currently
  // live, based on breakpoint — state (not a plain ref) because the marker
  // div doesn't exist in the DOM yet on the render that creates it.
  const [mobileHomeSlot, setMobileHomeSlot] = useState<HTMLDivElement | null>(
    null,
  );
  const [desktopHomeSlot, setDesktopHomeSlot] = useState<HTMLDivElement | null>(
    null,
  );
  const homeSlot = isDesktop ? desktopHomeSlot : mobileHomeSlot;

  // The "更多" flyout is a plain custom popover (not a Radix primitive), so
  // it doesn't get Radix's built-in outside-click/Escape dismissal for
  // free — without this it stayed open (just visually stranded behind
  // whatever opened on top of it, like the account dropdown or the login
  // dialog) since nothing here ever told it to close. Listening at the
  // document level also catches clicks inside those other overlays, which
  // render into a portal outside this component's own DOM subtree.
  useEffect(() => {
    if (!moreOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (!moreFlyoutRef.current?.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Escape unmounts whatever was focused inside the flyout, dropping
      // focus back to <body> — return it to the trigger so keyboard users
      // don't lose their place in the page.
      if (moreFlyoutRef.current?.contains(document.activeElement)) {
        moreButtonRef.current?.focus();
      }
      setMoreOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreOpen]);

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

  // Identifies "what's currently in the content slot" — shared by the
  // AnimatePresence keys below and the scroll-reset effect, so a mode/panel
  // switch always starts scrolled to top instead of inheriting whatever
  // scrollTop the previous content happened to be left at (which otherwise
  // makes the new content look like it's missing its top half).
  const activeContentKey = modePanelActive ? sheetMode : activeRailPanel;

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
        setMobileSheetSnap("peek");
        break;
      case "place":
      case "plan":
      case "route":
      case "station":
        setMobileSheetSnap("half");
        break;
      case "navigation":
        setMobileSheetSnap("peek");
        break;
    }
  }, [sheetMode, setMobileSheetSnap]);

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
      setMobileSheetSnap("half");
    }
  }, [showAssistant, isDesktop, setMobileSheetSnap]);

  // Same treatment for rail sub-panels: sheetMode stays "home" when a quick
  // action chip (or 已存地點管理 from the account menu) opens one, so the
  // sheetMode effect above never fires and the panel would otherwise be left
  // as a peek-height sliver with its header hidden.
  useEffect(() => {
    if (railContentActive && !isDesktop) {
      setMobileSheetSnap("half");
    }
  }, [railContentActive, isDesktop, setMobileSheetSnap]);

  // Reset scroll position whenever the content slot's occupant changes —
  // the scrollable container itself doesn't remount (only the animated
  // child inside it does), so without this a leftover scrollTop from the
  // previous panel silently carries over onto the new one.
  // biome-ignore lint/correctness/useExhaustiveDependencies(activeContentKey): trigger-only dependency, not read in the body
  useEffect(() => {
    mobileContentScrollRef.current?.scrollTo({ top: 0 });
    desktopContentScrollRef.current?.scrollTo({ top: 0 });
  }, [activeContentKey]);

  // Opening the step list mid-navigation lifts the mobile sheet to half.
  useEffect(() => {
    if (isNavigating && stepListOpen) {
      setMobileSheetSnap("half");
    }
  }, [isNavigating, stepListOpen, setMobileSheetSnap]);

  // Coach marks' 2nd step targets the a11y quick-action chip, which sits well
  // below the fold at peek height (content there doesn't even scroll — only
  // dragging does). Without this the spotlight lands on a clipped/off-screen
  // rect and the tour looks broken. Same treatment as the other panel lifts.
  useEffect(() => {
    if (coachMarksActive && !isDesktop) {
      setMobileSheetSnap("half");
    }
  }, [coachMarksActive, isDesktop, setMobileSheetSnap]);

  // Sync sheetHeight whenever mobileSheetSnap changes
  useEffect(() => {
    setSheetHeight(SNAP_POINTS[mobileSheetSnap]);
  }, [mobileSheetSnap]);

  const snapToNearest = useCallback(
    (ratio: number) => {
      const points: Array<"peek" | "half" | "full"> = ["peek", "half", "full"];
      let closest: "peek" | "half" | "full" = "peek";
      let minDist = Math.abs(ratio - SNAP_POINTS.peek);
      for (const p of points) {
        const dist = Math.abs(ratio - SNAP_POINTS[p]);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      }
      setSheetHeight(SNAP_POINTS[closest]);
      setMobileSheetSnap(closest);
    },
    [setMobileSheetSnap],
  );

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
        requestNavExit(panel);
        return;
      }
      if (collapsed) {
        setCollapsed(false);
        if (modePanelActive) {
          setSheetMode("home");
          setComputeRoutes(null);
          setRouteA11y([]);
          setRouteSelect(null);
          setInfoShow({ isOpen: false, kind: null });
          setSearchPlace(null);
        }
        setActiveRailPanel(panel);
        setMoreOpen(false);
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
                <AccountLogin active={!isDesktop} />
              </div>
            )}

          {/* Mobile Content — overflow hidden at peek so users drag the
              sheet up instead of scrolling within a tiny sliver. Tapping
              the content area at peek lifts the sheet to half. */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: tapping empty space at peek expands sheet */}
          {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: dynamic button role when at peek */}
          <div
            ref={mobileContentScrollRef}
            className={cn(
              "flex-1 overflow-x-hidden pb-safe",
              showAssistant ? "overflow-hidden px-0" : "px-4",
              atPeek && !showAssistant
                ? "overflow-y-hidden"
                : "overflow-y-auto",
            )}
            role={
              atPeek && sheetMode === "home" && !showAssistant
                ? "button"
                : undefined
            }
            tabIndex={
              atPeek && sheetMode === "home" && !showAssistant ? 0 : undefined
            }
            aria-label={
              atPeek && sheetMode === "home" && !showAssistant
                ? t("expandPanel", "展開面板")
                : undefined
            }
            onClick={
              atPeek && sheetMode === "home" && !showAssistant
                ? (e) => {
                    if (
                      (e.target as HTMLElement).closest(
                        "input, textarea, button",
                      )
                    ) {
                      return;
                    }
                    setMobileSheetSnap("half");
                  }
                : undefined
            }
            onKeyDown={
              atPeek && sheetMode === "home" && !showAssistant
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMobileSheetSnap("half");
                    }
                  }
                : undefined
            }
          >
            {/* Both stay mounted — a conditional-render ternary here used to
                unmount `AIChatBot` every time the assistant closed, which
                reset its conversation (state now lives in a store so that
                alone wouldn't lose messages anymore, but remounting still
                cost the scroll position and a re-render flash). `inert` +
                `aria-hidden` pull the hidden side out of both the tab order
                and the a11y tree, matching how the mobile/desktop split of
                this same component already does it via the `active` prop. */}
            <div
              className={cn("h-full", !showAssistant && "hidden")}
              inert={!showAssistant}
              aria-hidden={!showAssistant}
            >
              <AIChatBot active={!isDesktop} />
            </div>
            <div
              className={cn("h-full", showAssistant && "hidden")}
              inert={showAssistant}
              aria-hidden={showAssistant}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeContentKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <MobileSheetContent onHomeSlotRef={setMobileHomeSlot} />
                </motion.div>
              </AnimatePresence>
            </div>
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
                aria-current={isActive ? "page" : undefined}
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
                <span className="text-xs mt-0.5 leading-none font-medium truncate max-w-[48px]">
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
          <div className="relative" ref={moreFlyoutRef}>
            <button
              ref={moreButtonRef}
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
              <span className="text-xs mt-0.5 leading-none font-medium">
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
                        aria-current={isActive ? "page" : undefined}
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
            <AccountLogin active={isDesktop} />
          </div>
        </nav>

        {/* --- Layer 2: Content Panel --- */}
        {/* `AnimatePresence` still owns the genuine mount/unmount transition
            (panel appearing/disappearing, or the nav step list opening) —
            but `collapsed` no longer gates that condition. It used to: the
            whole panel (including a mounted `AIChatBot`) was removed from
            the DOM every time the sidebar collapsed, which reset whatever
            was inside. `collapsed` now only drives the `animate` target
            below, a prop change on an already-mounted element rather than a
            removal, so collapsing never costs the chat its history again. */}
        <AnimatePresence>
          {(isNavigating ? stepListOpen : panelOpen) && (
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
              animate={
                collapsed && !isNavigating
                  ? { x: -400, opacity: 0 }
                  : { x: 0, opacity: 1 }
              }
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              inert={collapsed && !isNavigating}
              aria-hidden={collapsed && !isNavigating}
            >
              {/* Panel header — suppressed when the content below already
                  renders its own (see MODE_PANELS_WITH_OWN_HEADER), otherwise
                  the two stack into a double header. Close/back button is
                  44px (WCAG touch-target floor), not the original 28px. */}
              {!(
                modePanelActive && MODE_PANELS_WITH_OWN_HEADER.has(sheetMode)
              ) && (
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
                    className="h-11 w-11 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
                    aria-label={
                      showAssistant || railContentActive
                        ? t("back")
                        : t("close")
                    }
                  >
                    {showAssistant || railContentActive ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Panel content */}
              <div
                ref={desktopContentScrollRef}
                className={cn(
                  "flex-1 overflow-y-auto overflow-x-hidden",
                  showAssistant ? "overflow-hidden p-0" : "p-4",
                )}
              >
                {/* Both stay mounted (see the mobile side's identical
                    comment above) instead of a conditional-render ternary
                    that used to unmount `AIChatBot` on every panel switch. */}
                <div
                  className={cn("h-full", !showAssistant && "hidden")}
                  inert={!showAssistant}
                  aria-hidden={!showAssistant}
                >
                  <AIChatBot active={isDesktop} />
                </div>
                <div
                  className={cn("h-full", showAssistant && "hidden")}
                  inert={showAssistant}
                  aria-hidden={showAssistant}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeContentKey}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.12 }}
                    >
                      <DesktopPanelContent onHomeSlotRef={setDesktopHomeSlot} />
                    </motion.div>
                  </AnimatePresence>
                </div>
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
              "pointer-events-auto fixed top-1/2 -translate-y-1/2 z-(--z-drawer-rail) h-12 w-11 flex items-center justify-center",
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

      {/* Single real mount of the home screen (search box included) —
          portaled into whichever of the two marker slots below is live for
          the current breakpoint, instead of being rendered twice (once per
          breakpoint) like every other rail panel here still is. */}
      {homeSlot && createPortal(<HomeContent />, homeSlot)}
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
function RailPanelOrHome({
  onHomeSlotRef,
}: {
  onHomeSlotRef: (el: HTMLDivElement | null) => void;
}) {
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
    // sync with RAIL_CONTENT_PANELS. This marker div is a portal *target*,
    // not `HomeContent` itself — see the single real mount in `BottomSheet`.
    default:
      return <div ref={onHomeSlotRef} className="contents" />;
  }
}

// --- Desktop panel content switcher ---
function DesktopPanelContent({
  onHomeSlotRef,
}: {
  onHomeSlotRef: (el: HTMLDivElement | null) => void;
}) {
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

  return <RailPanelOrHome onHomeSlotRef={onHomeSlotRef} />;
}

// --- Mobile sheet content ---
function MobileSheetContent({
  onHomeSlotRef,
}: {
  onHomeSlotRef: (el: HTMLDivElement | null) => void;
}) {
  const { sheetMode } = useMapStore(
    useShallow((s) => ({ sheetMode: s.sheetMode })),
  );
  switch (sheetMode) {
    case "home":
      return <RailPanelOrHome onHomeSlotRef={onHomeSlotRef} />;
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
      return <RailPanelOrHome onHomeSlotRef={onHomeSlotRef} />;
  }
}
