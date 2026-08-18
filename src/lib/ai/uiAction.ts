import type { SheetMode } from "@/stores/useMapStore";
import type { AiResultMarker, LatLng } from "@/types";
import type { AccessibleRoute } from "@/types/route";

// ── Map ──

interface ShowMarkersAction {
  type: "show-markers";
  markers: AiResultMarker[];
}

interface ClearMarkersAction {
  type: "clear-markers";
}

interface FlyToAction {
  type: "fly-to";
  position: LatLng;
  zoom?: number;
}

// ── Route ──

interface ShowRouteAction {
  type: "show-route";
  origin: LatLng;
  destination: LatLng;
  routes: AccessibleRoute[];
}

interface ComputeRouteAction {
  type: "compute-route";
  origin: LatLng;
  destination: LatLng;
}

// ── Panel ──

interface SwitchPanelAction {
  type: "switch-panel";
  sheet: SheetMode;
}

interface CloseChatAction {
  type: "close-chat";
}

// ── Union ──

export type UIAction =
  | ShowMarkersAction
  | ClearMarkersAction
  | FlyToAction
  | ShowRouteAction
  | ComputeRouteAction
  | SwitchPanelAction
  | CloseChatAction;

export interface ActionResult {
  ok: boolean;
  skipped?: string;
}
