// Types aligned with backend OpenAPI spec (POST /a11y/accessible-route)

// --- GeoJSON ---
export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

// --- Slim OSM A11y facility ---
export interface SlimOsmA11y {
  osmId: string;
  name?: string;
  category: "wheelchair_accessible" | "kerb_cut" | "ramp" | "elevator" | "toilet";
  wheelchair?: "yes" | "limited" | "no";
  tags?: Record<string, string>;
  location: GeoPoint;
}

// --- Wait info for transit legs ---
export interface WaitInfo {
  time: number | string | null;
  source: "realtime" | "schedule" | "unavailable";
}

// --- Nearest bus info ---
export interface NearestBus {
  plateNumb: string;
  position: [number, number]; // [lng, lat]
  speed?: number;
  stopsAway?: number;
}

// --- Exit info for walk legs ---
export interface ExitInfo {
  exitName: string;
  exitNumber: string;
  type: "elevator" | "ramp";
  coords: [number, number]; // [lng, lat]
}

// --- Leg types (discriminated union by `type`) ---

export interface WalkLeg {
  type: "WALK";
  from: string;
  to: string;
  distanceM: number;
  minutesEst: number;
  polyline: [number, number][]; // [lng, lat][]
  a11yFacilities: SlimOsmA11y[];
  a11yRefs?: string[];
  exitInfo?: ExitInfo | null;
}

export interface BusLeg {
  type: "BUS";
  routeName: string;
  departureStop: string;
  arrivalStop: string;
  departureStopId?: string;
  arrivalStopId?: string;
  cityCode?: string;
  departureTime?: string;
  arrivalTime?: string;
  waitInfo: WaitInfo;
  estimatedWaitMinutes: number;
  direction: 0 | 1;
  polyline: [number, number][];
  departureStopA11y: SlimOsmA11y[];
  arrivalStopA11y: SlimOsmA11y[];
  nearestBus?: NearestBus;
  a11yRefs?: string[];
}

export interface MetroLeg {
  type: "METRO";
  railSystem: string;
  lineId: string;
  lineName: string;
  lineUid: string;
  departureStation: string;
  arrivalStation: string;
  departureStationUid: string;
  arrivalStationUid: string;
  direction: 0 | 1;
  stopsCount: number;
  rideMinutes: number;
  departureTime?: string;
  arrivalTime?: string;
  waitInfo: WaitInfo;
  estimatedWaitMinutes: number;
  polyline: [number, number][];
  departureStationA11y: SlimOsmA11y[];
  arrivalStationA11y: SlimOsmA11y[];
  facilityHighlights: string[];
  a11yRefs?: string[];
}

export interface ThsrLeg {
  type: "THSR";
  trainNo: string;
  departureStation: string;
  arrivalStation: string;
  departureStationUID: string;
  arrivalStationUID: string;
  departureTime: string;
  arrivalTime: string;
  rideMinutes: number;
  waitInfo: WaitInfo;
  estimatedWaitMinutes: number;
  polyline: [number, number][];
  departureStationA11y: SlimOsmA11y[];
  arrivalStationA11y: SlimOsmA11y[];
  facilityHighlights: string[];
  a11yRefs?: string[];
}

export interface TraLeg {
  type: "TRA";
  trainNo: string;
  trainTypeName: string;
  departureStation: string;
  arrivalStation: string;
  departureStationUID: string;
  arrivalStationUID: string;
  departureTime: string;
  arrivalTime: string;
  rideMinutes: number;
  waitInfo: WaitInfo;
  estimatedWaitMinutes: number;
  polyline: [number, number][];
  departureStationA11y: SlimOsmA11y[];
  arrivalStationA11y: SlimOsmA11y[];
  facilityHighlights: string[];
  a11yRefs?: string[];
}

export type RouteLeg = WalkLeg | BusLeg | MetroLeg | ThsrLeg | TraLeg;

// --- Score components ---
export interface ScoreComponents {
  facilityScore: number;
  timeScore: number;
  criticalFeatureScore: number;
}

// --- Accessibility labels ---
export type A11yLabel = "excellent" | "good" | "fair" | "poor" | "critical";

// --- Single route ---
export interface AccessibleRoute {
  routeId: string;
  routeName: string;
  totalMinutes: number;
  transferCount: number;
  legs: RouteLeg[];
  accessibilityHighlights: string[];
  accessibilityScore?: number;
  accessibilityLabel?: A11yLabel;
  scoreComponents?: ScoreComponents;
  facilities?: Record<string, SlimOsmA11y>;
}

// --- Route intent (from /ai/intent) ---
export interface RouteIntent {
  from: string;
  to: string;
  mode: "wheelchair" | "elderly" | "visual_impaired" | "normal";
  departureTime: string;
  preferences: {
    minimizeTransfers: boolean;
    preferElevator: boolean;
  };
}

// --- Response envelope ---
export interface AccessibleRouteData {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  city: string;
  routes: AccessibleRoute[];
  intent?: RouteIntent;
}

// --- Request body ---
export interface AccessibleRouteRequest {
  origin?: string | { latitude: number; longitude: number };
  destination?: string | { latitude: number; longitude: number };
  query?: string;
  userLocation?: { latitude: number; longitude: number };
  mode?: "wheelchair" | "elderly" | "visual_impaired" | "normal";
  maxTransfers?: number;
  departureTime?: string;
  format?: "standard" | "compact";
}

// --- Intent request/response ---
export interface IntentRequest {
  query: string;
}

export interface IntentResponse {
  ok: boolean;
  status: string;
  code: number;
  message: string;
  data?: RouteIntent;
}

// --- Route explanation (from /ai/explain) ---
export interface RouteExplanation {
  summary: string;
  accessibilityHighlights: string[];
  warnings: string[];
  alternatives: string | null;
}

// --- Air quality (from /air/air-quality) ---
export type AirQualityLevel =
  | "GOOD"
  | "MODERATE"
  | "UNHEALTHY_SENSITIVE"
  | "UNHEALTHY"
  | "VERY_UNHEALTHY"
  | "HAZARDOUS"
  | "";

export interface AirQualityData {
  description: string;
  quality: AirQualityLevel;
}

// --- AI Chat (from /ai/chat) ---
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  userLocation?: { latitude: number; longitude: number };
}

// --- Helper functions ---

export function getA11yLabelColor(label: A11yLabel): string {
  switch (label) {
    case "excellent": return "#22c55e";
    case "good": return "#84cc16";
    case "fair": return "#eab308";
    case "poor": return "#f97316";
    case "critical": return "#ef4444";
  }
}

export function getA11yLabelText(label: A11yLabel, lang: string): string {
  if (lang === "zh-TW") {
    switch (label) {
      case "excellent": return "極佳";
      case "good": return "良好";
      case "fair": return "普通";
      case "poor": return "較差";
      case "critical": return "困難";
    }
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function scoreToLabel(score: number): A11yLabel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  if (score >= 20) return "poor";
  return "critical";
}

const LEG_COLORS: Record<string, string> = {
  WALK: "#3b82f6",
  BUS: "#22c55e",
  METRO: "#FF6B35",
  THSR: "#f97316",
  TRA: "#003366",
};

export function getLegColor(leg: RouteLeg): string {
  if (leg.type === "BUS") return LEG_COLORS.BUS;
  if (leg.type === "METRO") return LEG_COLORS.METRO;
  return LEG_COLORS[leg.type] || LEG_COLORS.BUS;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) return `${hours}h ${mins}min`;
  return `${mins} min`;
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function formatWaitInfo(waitInfo: WaitInfo): string | null {
  if (waitInfo.source === "unavailable") return null;
  if (waitInfo.source === "realtime" && typeof waitInfo.time === "number") {
    return `${waitInfo.time} min`;
  }
  if (waitInfo.source === "schedule" && typeof waitInfo.time === "string") {
    return waitInfo.time;
  }
  if (typeof waitInfo.time === "number") {
    return `~${waitInfo.time} min`;
  }
  return null;
}
