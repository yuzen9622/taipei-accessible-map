import type { IBathroom, LatLng, metroA11yData } from ".";

type BusEstimate = {
  PlateNumb: string;
  EstimateTime: number;
  IsLastBus: boolean;
  VehicleStopStatus: number;
};

export const BUS_STATUS = {
  0: "正常",
  1: "尚未發車",
  2: "交管不停靠",
  3: "末班車已過",
  4: "今日未營運",
} as const;

export type BusSearchResult = {
  routeName: string;
  city: string;
  departure: string;
  destination: string;
};

export type BusStopSearchResult = {
  stopUid: string;
  stopName: string;
  city: string;
  coordinates: [number, number]; // [lng, lat]
  routes: string[];
};

export type BusRealtimeNearbyStop = {
  PlateNumb: string;
  StopUID: string;
  StopID: string;
  StopName: {
    Zh_tw: string;
    En: string;
  };
  RouteUID: string;
  RouteID: string;
  RouteName: {
    Zh_tw: string;
    En: string;
  };
  SubRouteUID: string;
  SubRouteID: string;
  SubRouteName: {
    Zh_tw: string;
    En: string;
  };
  Direction: number;
  EstimateTime: number;
  ScheduledTime: string;
  StopCountDown: number;
  CurrentStop: string;
  DestinationStop: string;
  StopSequence: number;
  StopStatus: keyof typeof BUS_STATUS;
  MessageType: number;
  NextBusTime: string; // ISO 字串
  IsLastBus: boolean;
  Estimates?: BusEstimate[];
  DataTime: string;
  TransTime: string;
  SrcRecTime: string;
  SrcTransTime: string;
  SrcUpdateTime: string;
  UpdateTime: string;
};
export type BusRealtimeInfo = {
  PlateNumb: string;
  OperatorID: string;
  OperatorNo: string;
  RouteUID: string;
  RouteID: string;
  RouteName: {
    Zh_tw: string;
    En: string;
  };
  SubRouteUID: string;
  SubRouteID: string;
  SubRouteName: {
    Zh_tw: string;
    En: string;
  };
  Direction: number;
  BusPosition: {
    PositionLon: number;
    PositionLat: number;
    GeoHash: string;
  };
  Speed: number;
  Azimuth: number;
  DutyStatus: number;
  BusStatus: number;
  MessageType: number;
  GPSTime: string;
  TransTime: string;
  SrcRecTime: string;
  SrcTransTime: string;
  SrcUpdateTime: string;
  UpdateTime: string;
};

// Vehicle types (replacing google.maps.VehicleType)
export enum VehicleType {
  BUS = "BUS",
  INTERCITY_BUS = "INTERCITY_BUS",
  RAIL = "RAIL",
  HEAVY_RAIL = "HEAVY_RAIL",
  HIGH_SPEED_TRAIN = "HIGH_SPEED_TRAIN",
  SUBWAY = "SUBWAY",
  TRAM = "TRAM",
}

type CommonTransitDetail = {
  stepIndex: string;
  type: VehicleType;
  lineName: string;
  headsign: string;
  shortName: string;
  departureStopName: string;
  arrivalStopName: string;
  arrivalLat: number;
  arrivalLng: number;
};
export type BusTransitDetail = CommonTransitDetail & {
  type: VehicleType.BUS | VehicleType.INTERCITY_BUS;
  nearbyStop?: BusRealtimeNearbyStop;
  realtimeInfo?: BusRealtimeInfo;
  routeShortName?: string;
};

export type RailTransitDetail = CommonTransitDetail & {
  type:
    | VehicleType.RAIL
    | VehicleType.HEAVY_RAIL
    | VehicleType.HIGH_SPEED_TRAIN;
  platform?: string;
  carNumber?: string;
};

export type SubwayTransitDetail = CommonTransitDetail & {
  type: VehicleType.SUBWAY | VehicleType.TRAM;
  headway?: number;
  lastTrainTimeText?: string;
};

export type RouteTransitDetail =
  | BusTransitDetail
  | RailTransitDetail
  | SubwayTransitDetail;

export type RankRequest = {
  start: LatLng;
  end: LatLng;
  instructions: string;
  duration: number;
  line?: { name: string; shortName?: string };
};
export interface AIRankResponse {
  route_description: string;
  route_total_score: number;
}

export interface AIRouteResponse {
  route_index: number;
}
export interface GooglePlaceResult {
  name: string;
  place_id: string;
  formatted_address: string;
  rating: number;
  location: { latitude: number; longitude: number };
}
export interface AIRouteResponse {
  origin: {
    latitude: number;
    longitude: number;
  };
  destination: {
    latitude: number;
    longitude: number;
  };
  travelMode: string;
}
export interface AIChatResponse {
  message: string;
  a11yPlacesResults?: {
    nearbyBathroom: IBathroom[];
    nearbyMetroA11y: metroA11yData[];
  };
  googlePlacesResults?: GooglePlaceResult[];
  planRouteResult?: AIRouteResponse;
}

export function isBusTransitDetail(
  detail: RouteTransitDetail,
): detail is BusTransitDetail {
  return (
    detail.type === VehicleType.BUS || detail.type === VehicleType.INTERCITY_BUS
  );
}

export function isRailTransitDetail(
  detail: RouteTransitDetail,
): detail is RailTransitDetail {
  return (
    detail.type === VehicleType.RAIL ||
    detail.type === VehicleType.HEAVY_RAIL ||
    detail.type === VehicleType.HIGH_SPEED_TRAIN
  );
}

export function isSubwayTransitDetail(
  detail: RouteTransitDetail,
): detail is SubwayTransitDetail {
  return detail.type === VehicleType.SUBWAY || detail.type === VehicleType.TRAM;
}
