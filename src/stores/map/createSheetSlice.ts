"use client";
import { LngLatBounds } from "maplibre-gl";
import { computeMapPadding } from "./mapPadding";
import type {
  MapSliceCreator,
  MapStore,
  MobileSheetSnap,
  RailPanel,
  SheetSlice,
} from "./types";

export const createSheetSlice: MapSliceCreator<SheetSlice> = (set, get) => ({
  sheetMode: "home",
  setSheetMode: (mode) => {
    const update: Partial<MapStore> = { sheetMode: mode };
    if (mode !== "home" && mode !== "navigation") {
      update.sidebarCollapsed = false;
    }
    if (get().chatOpen) {
      update.chatOpen = false;
    }
    set(update);
  },
  mobileSheetSnap: "peek" as MobileSheetSnap,
  setMobileSheetSnap: (snap) => set({ mobileSheetSnap: snap }),
  isNavigating: false,
  setIsNavigating: (v) => {
    const { map } = get();
    if (v) {
      set({ isNavigating: true, sheetMode: "navigation", is3D: true });
    } else {
      // activeRailPanel: "route" mirrors the reset every other entry point
      // into sheetMode "route" performs (RoutePlanContent, SosTrackerWrapper,
      // RoutePreviewHydrator) — without it, a rail sub-panel left active
      // before navigation started (e.g. "hazard" from a home quick-action
      // chip, or the voice assistant driving nav start/stop without ever
      // going through RouteContent) would leak into RouteContent on return
      // from navigation and show that sub-panel instead of the route list.
      set({
        isNavigating: false,
        sheetMode: "route",
        activeRailPanel: "route",
        is3D: false,
      });
      if (map) {
        const legs = get().selectRoute?.route.legs ?? [];
        const bounds = new LngLatBounds();
        for (const leg of legs) {
          for (const [lng, lat] of leg.polyline ?? [])
            bounds.extend([lng, lat]);
        }
        if (bounds.isEmpty()) {
          map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
        } else {
          map.fitBounds(bounds, {
            pitch: 0,
            bearing: 0,
            duration: 1000,
            padding: computeMapPadding(get().sidebarCollapsed),
          });
        }
      }
    }
  },
  pendingNavExit: null,
  requestNavExit: (target) => {
    if (!get().isNavigating) {
      return;
    }
    set({ pendingNavExit: { target } });
  },
  confirmNavExit: () => {
    const intent = get().pendingNavExit;
    set({ pendingNavExit: null });
    if (!intent) return;
    // End navigation first — setIsNavigating(false) sets sheetMode to "route",
    // but the intent callback below will override it to the desired target.
    set({ isNavigating: false, is3D: false });
    const { map } = get();
    if (map) {
      const legs = get().selectRoute?.route.legs ?? [];
      const bounds = new LngLatBounds();
      for (const leg of legs) {
        for (const [lng, lat] of leg.polyline ?? []) bounds.extend([lng, lat]);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          pitch: 0,
          bearing: 0,
          duration: 1000,
          padding: computeMapPadding(get().sidebarCollapsed),
        });
      } else {
        map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
      }
    }
    // Apply the intent: switch to the target panel
    if (intent.target === "plan") {
      get().setSheetMode("plan");
    } else {
      get().setSheetMode("home");
      set({
        computeRoutes: null,
        routeWaypoints: [],
        routeA11y: [],
        selectRoute: null,
        infoShow: { isOpen: false, kind: null },
        searchPlace: null,
      });
      if (intent.target !== "home") {
        get().setActiveRailPanel(intent.target);
      }
    }
  },
  cancelNavExit: () => {
    set({ pendingNavExit: null });
  },
  activeRailPanel: "search" as RailPanel,
  setActiveRailPanel: (panel) => {
    const update: Partial<MapStore> = { activeRailPanel: panel };
    if (panel !== "none") {
      update.sidebarCollapsed = false;
    }
    if (get().chatOpen) {
      update.chatOpen = false;
    }
    set(update);
  },
});
