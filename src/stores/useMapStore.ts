"use client";
import type maplibregl from "maplibre-gl";
import { LngLatBounds } from "maplibre-gl";
import { create } from "zustand";
import type {
  AiResultMarker,
  InfoShow,
  LatLng,
  Marker,
  PlaceDetail,
} from "@/types";
import { A11yEnum } from "@/types/index";
import type {
  AccessibleRoute,
  LiveBus,
  MatchedAlert,
  MetroAlertResult,
} from "@/types/route";

// 無障礙設施 used to be a sheetMode of its own; it's a rail panel now
// (RailPanel below), so nothing sets a "a11y" sheet mode any more.
export type SheetMode =
  | "home"
  | "place"
  | "plan"
  | "route"
  | "navigation"
  | "station";
export type RailPanel =
  | "none"
  | "search"
  | "route"
  | "a11y"
  | "bus"
  | "parking"
  | "environment"
  | "hazard"
  | "welfare"
  | "saved"
  // Route-results-only sub-panel (AI 路線說明). Only ever set/read while
  // sheetMode === "route" (see RouteContent); not reachable from the home
  // rail, so it's absent from RAIL_ITEMS/RAIL_MORE_ITEMS/RAIL_CONTENT_PANELS.
  | "explanation";

interface MapState {
  map: maplibregl.Map | null;
  userLocation: LatLng | null;
  origin: PlaceDetail | null;
  destination: PlaceDetail | null;
  infoShow: InfoShow;
  routeInfoShow: boolean;
  /** True when the active route targets a live SOS requester (hides the static destination pin in favor of the pulsing SOS marker). */
  sosNavActive: boolean;
  setSosNavActive: (active: boolean) => void;
  searchPlace: PlaceDetail | null;
  computeRoutes: AccessibleRoute[] | null;
  /** System-level metro operating alerts that came with the current route response (absent when all clear). */
  metroAlerts: MetroAlertResult[] | null;
  /** Transit operating alerts across routes/legs from the current route response. */
  transitAlerts: MatchedAlert[] | null;
  routeWaypoints: LatLng[];
  selectRoute: {
    index: number;
    route: AccessibleRoute;
  } | null;
  routeA11y: Marker[];
  selectedA11yTypes: Set<A11yEnum>;
  /** §6.1 of the UX audit: "無障礙" used to be simultaneously a rail item, a
   * quick-action chip, a route mode, and a place-detail section — none of
   * which agreed on what state they were reading, so there was no single
   * answer to "is accessibility filtering on right now". This is that
   * answer — a global mode, not a per-category detail (that's still
   * `selectedA11yTypes`) — synced to the `?a11y=1` URL query so it survives
   * a reload and is shareable. Read by the AI system prompt (see
   * `useAIChat.ts`) so far; wiring it into search results and route
   * planning needs backend support this app doesn't have yet (see
   * PROJECTS.md's 給後端的需求清單). */
  a11yFilterEnabled: boolean;
  a11yDrawerOpen: boolean;
  selectA11yPlace: Marker | null;
  a11yPlaces: Marker[] | null;
  searchHistory: PlaceDetail[];
  savedPlaces: PlaceDetail[];
  savedPlaceKeys: Set<string>;
  savedPlaceCategories: Record<string, SavedPlaceCategory>;
  originName: string;
  destinationName: string;
  sheetMode: SheetMode;
  isNavigating: boolean;
  pendingNavExit: { target: RailPanel | "plan" | "home" } | null;
  is3D: boolean;
  sidebarCollapsed: boolean;
  activeRailPanel: RailPanel;
  pendingSearchQuery: string;
  /** Set by the unified home-screen input when a query reads as a question rather than a place; `AIChatBot` consumes and sends it once the panel opens. */
  pendingAiQuery: string;
  /** Set when an unconfirmed a11y checklist item's "我知道 → 回報" link opens
   * the hazard report panel; `HazardReportPanel` consumes it as the initial
   * description so the report already names which facility it's about. */
  pendingReportContext: string;
  chatOpen: boolean;
  aiResultMarkers: AiResultMarker[];
  liveBusPositions: LiveBus[];
}

interface MapAction {
  setMap: (map: maplibregl.Map) => void;
  setUserLocation: (location: LatLng | null) => void;
  setOrigin: (origin: PlaceDetail | null) => void;
  setDestination: (destination: PlaceDetail | null) => void;
  setInfoShow: (infoShow: Partial<InfoShow>) => void;
  setSearchPlace: (place: PlaceDetail | null) => void;
  setComputeRoutes: (routes: AccessibleRoute[] | null) => void;
  setMetroAlerts: (alerts: MetroAlertResult[] | null) => void;
  setTransitAlerts: (alerts: MatchedAlert[] | null) => void;
  setRouteWaypoints: (waypoints: LatLng[]) => void;
  setRouteInfoShow: (show: boolean) => void;
  setSelectA11yPlace: (place: Marker | null) => void;
  setRouteSelect: (
    route: Partial<{
      index: number;
      route: AccessibleRoute;
    }> | null,
  ) => void;
  toggleA11yType: (type: A11yEnum) => void;
  setSelectedA11yTypes: (types: Set<A11yEnum>) => void;
  setA11yFilterEnabled: (enabled: boolean) => void;
  setA11yDrawerOpen: (open: boolean) => void;
  setA11yPlaces: (places: Marker[] | null) => void;
  initSearchHistory: (history: PlaceDetail[]) => void;
  addSearchHistory: (searchTerm: PlaceDetail) => void;
  clearSearchHistory: () => void;
  setRouteA11y: (a11y: Marker[]) => void;
  addRouteA11y: (a11y: Marker[]) => void;
  setOriginName: (name: string) => void;
  setDestinationName: (name: string) => void;
  initSavedPlaces: (places: PlaceDetail[]) => void;
  initSavedPlaceCategories: (cats: Record<string, SavedPlaceCategory>) => void;
  addSavedPlace: (place: PlaceDetail) => void;
  removeSavedPlace: (place: PlaceDetail) => void;
  clearSavedPlaces: () => void;
  isSavedPlace: (place: PlaceDetail) => boolean;
  setSavedPlaceCategory: (
    place: PlaceDetail,
    category: SavedPlaceCategory | null,
  ) => void;
  /**
   * The panel slot only ever shows one thing at a time (see
   * visual-design-spec.md §5.2): switching to any mode — regardless of
   * whether an AI tool call or a manual rail click triggered it — always
   * closes the AI assistant too. No `fromAI` exception on either platform.
   */
  setSheetMode: (mode: SheetMode) => void;
  setIsNavigating: (v: boolean) => void;
  requestNavExit: (target: RailPanel | "plan" | "home") => void;
  confirmNavExit: () => void;
  cancelNavExit: () => void;
  setIs3D: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setPendingSearchQuery: (query: string) => void;
  setPendingAiQuery: (query: string) => void;
  setPendingReportContext: (context: string) => void;
  setActiveRailPanel: (panel: RailPanel) => void;
  setChatOpen: (v: boolean) => void;
  setAiResultMarkers: (markers: AiResultMarker[]) => void;
  setLiveBusPositions: (positions: LiveBus[]) => void;
}

type MapStore = MapState & MapAction;

export function placeKey(p: PlaceDetail): string {
  return p.kind === "place"
    ? `p_${p.place.id}`
    : `c_${p.position.lat}_${p.position.lng}`;
}

export const SAVED_PLACE_CATEGORIES = [
  "favorite",
  "food",
  "transport",
  "medical",
  "other",
] as const;
export type SavedPlaceCategory = (typeof SAVED_PLACE_CATEGORIES)[number];

const SIDEBAR_RAIL_W = 56;
const SIDEBAR_GAP = 12;
const SIDEBAR_PANEL_W = 380;
const SIDEBAR_TOTAL = SIDEBAR_RAIL_W + SIDEBAR_GAP + SIDEBAR_PANEL_W + 16;

export function getMapPadding(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
  const collapsed = useMapStore.getState().sidebarCollapsed;
  const left =
    isDesktop && !collapsed ? SIDEBAR_TOTAL + 32 : isDesktop ? 80 : 50;
  return { top: 80, bottom: 200, left, right: 50 };
}

const useMapStore = create<MapStore>((set, get) => ({
  map: null,
  setMap: (map) => set({ map }),
  userLocation: null,
  setUserLocation: (userLocation) => {
    // GPS fires ~every second even when standing still; skip writes when the
    // fix moved less than ~0.5 m so subscribers don't re-render for nothing.
    const prev = get().userLocation;
    if (
      prev &&
      userLocation &&
      Math.abs(prev.lat - userLocation.lat) < 5e-6 &&
      Math.abs(prev.lng - userLocation.lng) < 5e-6
    ) {
      return;
    }
    set({ userLocation });
  },
  origin: null,
  setOrigin: (origin) => set({ origin }),
  destination: null,
  setDestination: (destination) => set({ destination }),
  routeInfoShow: false,
  setRouteInfoShow: (show) => set({ routeInfoShow: show }),
  sosNavActive: false,
  setSosNavActive: (active) => set({ sosNavActive: active }),
  infoShow: { isOpen: false, kind: null },
  setInfoShow: (infoShow) => {
    const nextInfoShow = { ...get().infoShow, ...infoShow } as InfoShow;
    const update: Partial<MapStore> = { infoShow: nextInfoShow };
    if (nextInfoShow.isOpen) {
      update.sidebarCollapsed = false;
    }
    set(update);
  },
  selectA11yPlace: null,
  setSelectA11yPlace: (place) => {
    if (place?.id === get().selectA11yPlace?.id) {
      set({ selectA11yPlace: null });
      return;
    }
    set({ selectA11yPlace: place });
  },
  searchPlace: null,
  setSearchPlace: (place) => set({ searchPlace: place }),
  computeRoutes: null,
  metroAlerts: null,
  transitAlerts: null,
  routeWaypoints: [],
  setComputeRoutes: (routes) =>
    set(
      routes
        ? { computeRoutes: routes }
        : {
            computeRoutes: null,
            metroAlerts: null,
            transitAlerts: null,
            routeWaypoints: [],
          },
    ),
  setMetroAlerts: (alerts) => set({ metroAlerts: alerts }),
  setTransitAlerts: (alerts) => set({ transitAlerts: alerts }),
  setRouteWaypoints: (waypoints) => set({ routeWaypoints: waypoints }),
  selectRoute: null,
  setRouteSelect: (route) => {
    if (!route) {
      set({ selectRoute: null });
      return;
    }
    set({
      selectRoute: {
        ...get().selectRoute,
        ...route,
      } as MapStore["selectRoute"],
    });
  },
  selectedA11yTypes: new Set<A11yEnum>(),
  toggleA11yType: (type: A11yEnum) => {
    const { selectedA11yTypes } = get();
    if (type === A11yEnum.NONE) {
      set({ selectedA11yTypes: new Set(), a11yDrawerOpen: false });
      return;
    }
    const next = new Set(selectedA11yTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    set({ selectedA11yTypes: next, a11yDrawerOpen: next.size > 0 });
  },
  setSelectedA11yTypes: (types: Set<A11yEnum>) => {
    set({ selectedA11yTypes: types, a11yDrawerOpen: types.size > 0 });
  },
  a11yFilterEnabled: false,
  setA11yFilterEnabled: (enabled) => set({ a11yFilterEnabled: enabled }),
  a11yDrawerOpen: false,
  setA11yDrawerOpen: (open) => set({ a11yDrawerOpen: open }),
  a11yPlaces: null,
  setA11yPlaces: (places) => set({ a11yPlaces: places }),
  searchHistory: [],
  initSearchHistory: (history) => {
    const validHistory = history.filter((item) => {
      const name =
        item.kind === "place"
          ? item.place.name || item.place.fullAddress || ""
          : item.address;
      return Boolean(name?.trim());
    });
    const seen = new Set<string>();
    const dedupedHistory = validHistory.filter((item) => {
      const name =
        item.kind === "place"
          ? item.place.name || item.place.fullAddress || ""
          : item.address;
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
    set({ searchHistory: dedupedHistory });
  },
  addSearchHistory: (searchTerm: PlaceDetail) => {
    const name =
      searchTerm.kind === "place"
        ? searchTerm.place.name || searchTerm.place.fullAddress || ""
        : searchTerm.address;
    if (!name?.trim()) return;
    const { searchHistory } = get();
    const deduped = searchHistory.filter((item) => {
      const itemName =
        item.kind === "place"
          ? item.place.name || item.place.fullAddress || ""
          : item.address;
      return itemName !== name;
    });
    const newHistory = [searchTerm, ...deduped.slice(0, 9)];
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
    set({ searchHistory: newHistory });
  },
  clearSearchHistory: () => {
    try {
      localStorage.removeItem("searchHistory");
    } catch {
      // ignore localStorage failures
    }
    set({ searchHistory: [] });
  },
  savedPlaces: [],
  savedPlaceKeys: new Set<string>(),
  savedPlaceCategories: {},
  initSavedPlaceCategories: (cats) => set({ savedPlaceCategories: cats }),
  setSavedPlaceCategory: (place, category) => {
    const { savedPlaceCategories } = get();
    const key = placeKey(place);
    const next = { ...savedPlaceCategories };
    if (category) next[key] = category;
    else delete next[key];
    localStorage.setItem("savedPlaceCategories", JSON.stringify(next));
    set({ savedPlaceCategories: next });
  },
  initSavedPlaces: (places) => {
    const validPlaces = places.filter((item) => {
      const name =
        item.kind === "place"
          ? item.place.name || item.place.fullAddress || ""
          : item.address;
      return Boolean(name?.trim());
    });
    set({
      savedPlaces: validPlaces,
      savedPlaceKeys: new Set(validPlaces.map(placeKey)),
    });
  },
  addSavedPlace: (place) => {
    const name =
      place.kind === "place"
        ? place.place.name || place.place.fullAddress || ""
        : place.address;
    if (!name?.trim()) return;
    const { savedPlaces, savedPlaceKeys } = get();
    const key = placeKey(place);
    if (savedPlaceKeys.has(key)) return;
    const updated = [place, ...savedPlaces];
    const nextKeys = new Set(savedPlaceKeys);
    nextKeys.add(key);
    localStorage.setItem("savedPlaces", JSON.stringify(updated));
    set({ savedPlaces: updated, savedPlaceKeys: nextKeys });
  },
  removeSavedPlace: (place) => {
    const { savedPlaces, savedPlaceKeys, savedPlaceCategories } = get();
    const key = placeKey(place);
    if (!savedPlaceKeys.has(key)) return;
    const updated = savedPlaces.filter((p) => placeKey(p) !== key);
    const nextKeys = new Set(savedPlaceKeys);
    nextKeys.delete(key);
    const nextCats = { ...savedPlaceCategories };
    delete nextCats[key];
    localStorage.setItem("savedPlaces", JSON.stringify(updated));
    localStorage.setItem("savedPlaceCategories", JSON.stringify(nextCats));
    set({
      savedPlaces: updated,
      savedPlaceKeys: nextKeys,
      savedPlaceCategories: nextCats,
    });
  },
  clearSavedPlaces: () => {
    try {
      localStorage.removeItem("savedPlaces");
      localStorage.removeItem("savedPlaceCategories");
    } catch {
      // ignore localStorage failures
    }
    set({
      savedPlaces: [],
      savedPlaceKeys: new Set<string>(),
      savedPlaceCategories: {},
    });
  },
  isSavedPlace: (place) => {
    return get().savedPlaceKeys.has(placeKey(place));
  },
  routeA11y: [],
  setRouteA11y: (a11y) => {
    const deduped = Array.from(
      new Map(a11y.map((m) => [m.id, m])).values(),
    ) as Marker[];
    set({ routeA11y: deduped });
  },
  addRouteA11y: (a11y) => set({ routeA11y: [...get().routeA11y, ...a11y] }),
  originName: "",
  setOriginName: (name) => set({ originName: name }),
  destinationName: "",
  setDestinationName: (name) => set({ destinationName: name }),
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
  pendingSearchQuery: "",
  setPendingSearchQuery: (query) => set({ pendingSearchQuery: query }),
  pendingAiQuery: "",
  setPendingAiQuery: (query) => set({ pendingAiQuery: query }),
  pendingReportContext: "",
  setPendingReportContext: (context) => set({ pendingReportContext: context }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
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
  chatOpen: false,
  setChatOpen: (v) =>
    // Also un-collapse the desktop sidebar when opening: the AI panel is
    // rendered inside Layer 2, which stays `inert`+off-screen while
    // `sidebarCollapsed` is true (see BottomSheet.tsx) — the rail's own
    // click handler already does this un-collapse, but the several other
    // entry points that open chat directly (home screen mic, floating FAB,
    // onboarding, voice) don't go through that handler, so without this a
    // desktop user with the sidebar collapsed would tap one of those and
    // nothing visibly happens.
    set(v ? { chatOpen: v, sidebarCollapsed: false } : { chatOpen: v }),
  aiResultMarkers: [],
  setAiResultMarkers: (markers) => set({ aiResultMarkers: markers }),
  liveBusPositions: [],
  setLiveBusPositions: (positions) => set({ liveBusPositions: positions }),
  isNavigating: false,
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
          padding: getMapPadding(),
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
            padding: getMapPadding(),
          });
        }
      }
    }
  },
  is3D: false,
  setIs3D: (v) => {
    set({ is3D: v });
    const { map, isNavigating } = get();
    // While navigating the camera loop applies pitch/bearing every tick;
    // easing here would fight it, so only drive the camera outside navigation.
    // 2D means a flat, north-up plane — reset bearing along with pitch.
    if (map && !isNavigating) {
      if (v) map.easeTo({ pitch: 60, duration: 600 });
      else map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
  },
}));

export default useMapStore;
