export type MatchKind =
  | "route"
  | "stop"
  | "station"
  | "line"
  | "train"
  | "section";

export interface MatchedAlert {
  alertId: string;
  title: string;
  description: string;
  status: number | string;
  cause?: number | string;
  effect?: number | string;
  level?: number | string;
  reason?: string;
  matchKind: MatchKind;
  startTime?: string | null;
  endTime?: string | null;
  alertUrl?: string;
}

// 捷運專用（若需讀取站點名稱解析）
export interface MetroAlert {
  alertId: string;
  title: string;
  description: string;
  status: number;
  stations: Array<{ id: string; name: string | null }>;
  lines: string[];
  publishTime: string;
  updateTime: string;
}

export type TransitAlert = MatchedAlert | MetroAlert;
