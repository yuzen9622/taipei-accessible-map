export type RoutePreviewLegType =
  | "WALK"
  | "BUS"
  | "METRO"
  | "THSR"
  | "TRA"
  | "DRIVE"
  | "MOTORCYCLE";

export type RoutePreviewCoordinate = [number, number];

export interface RoutePreviewPoint {
  label: string;
  lat?: number;
  lng?: number;
}

export interface RoutePreviewDestination {
  label: string;
  lat: number;
  lng: number;
  address?: string | null;
}

export interface RoutePreviewLeg {
  type: RoutePreviewLegType;
  label?: string;
  from?: string;
  to?: string;
  durationMinutes?: number;
  durationMin?: number;
  distanceM?: number;
  departureTime?: string | null;
  arrivalTime?: string | null;
  polyline?: RoutePreviewCoordinate[];
}

export interface RoutePreviewRoute {
  routeName: string;
  totalMinutes: number;
  transferCount?: number;
  accessibilityScore?: number | null;
  accessibilityLabel?: string | null;
  legs: RoutePreviewLeg[];
}

export interface RoutePreviewPageData {
  sessionId: string;
  origin: RoutePreviewPoint;
  destination: RoutePreviewDestination;
  routes: RoutePreviewRoute[];
}
