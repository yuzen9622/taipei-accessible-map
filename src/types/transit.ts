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

// export type RouteTransitDetail = {
//   step: number;
//   type: google.maps.VehicleType;

//   nearbyStop?: BusRealtimeNearbyStop;
//   realtimeInfo?: BusRealtimeInfo;
// };

type CommonTransitDetail = {
  stepIndex: string; // 在整體路線中的步驟索引
  type: google.maps.VehicleType;
  lineName: string;
  headsign: string;
  shortName: string;
  departureStopName: string;
  arrivalStopName: string;
  arrivalLat: number;
  arrivalLng: number;
};
export type BusTransitDetail = CommonTransitDetail & {
  type: google.maps.VehicleType.BUS | google.maps.VehicleType.INTERCITY_BUS;
  nearbyStop?: BusRealtimeNearbyStop;
  realtimeInfo?: BusRealtimeInfo;
  routeShortName?: string;
};

export type RailTransitDetail = CommonTransitDetail & {
  type:
    | google.maps.VehicleType.RAIL
    | google.maps.VehicleType.HEAVY_RAIL
    | google.maps.VehicleType.HIGH_SPEED_TRAIN;
  platform?: string;
  carNumber?: string;
};

export type SubwayTransitDetail = CommonTransitDetail & {
  type: google.maps.VehicleType.SUBWAY | google.maps.VehicleType.TRAM;
  headway?: number; // 列車間隔時間（分鐘）
  lastTrainTimeText?: string; // 末班車時間
};

export type RouteTransitDetail =
  | BusTransitDetail
  | RailTransitDetail
  | SubwayTransitDetail;

export type RankRequest = {
  start: google.maps.LatLngLiteral;
  end: google.maps.LatLngLiteral;
  instructions: string;
  duration: number;
  line?: google.maps.TransitLine;
};
export interface AIRankResponse {
  route_description: string;
  route_total_score: number;
}

export function isBusTransitDetail(
  detail: RouteTransitDetail
): detail is BusTransitDetail {
  return (
    detail.type === google.maps.VehicleType.BUS ||
    detail.type === google.maps.VehicleType.INTERCITY_BUS
  );
}

export function isRailTransitDetail(
  detail: RouteTransitDetail
): detail is RailTransitDetail {
  return (
    detail.type === google.maps.VehicleType.RAIL ||
    detail.type === google.maps.VehicleType.HEAVY_RAIL ||
    detail.type === google.maps.VehicleType.HIGH_SPEED_TRAIN
  );
}

export function isSubwayTransitDetail(
  detail: RouteTransitDetail
): detail is SubwayTransitDetail {
  return (
    detail.type === google.maps.VehicleType.SUBWAY ||
    detail.type === google.maps.VehicleType.TRAM
  );
}
