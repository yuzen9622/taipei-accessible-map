type BusEstimate = {
  PlateNumb: string;
  EstimateTime: number;
  IsLastBus: boolean;
  VehicleStopStatus: number;
};

export enum StopStatusEnum {
  NORMAL = 0,
  NOT_STARTED = 1,
  NO_STOP = 2,
  LEAVE = 3,
  SUSPEND = 4,
}
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
  StopStatus: StopStatusEnum;
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
