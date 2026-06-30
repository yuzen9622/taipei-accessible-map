import type { AiResultMarker, LatLng } from "@/types";
import {
  a11yPlacesToMarkers,
  getLatLng,
  googlePlacesToMarkers,
} from "./aiResults";

// biome-ignore lint/suspicious/noExplicitAny: 後端工具回傳形狀不固定，這裡刻意用 any 做防禦式存取
type AnyRec = Record<string, any>;

export type ToolCardIcon =
  | "search"
  | "a11y"
  | "parking"
  | "bus"
  | "air"
  | "env"
  | "hazard"
  | "nav";

export type ToolResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  position?: LatLng | null;
  // 有 target → 開既有詳情面板；否則有 position → 飛到該點
  target?: AiResultMarker["target"];
};

export type ToolResultGroup = {
  heading: string;
  icon: ToolCardIcon;
  items: ToolResultItem[];
  /** 顯示在標題下的摘要文字（建議、天氣描述等） */
  note?: string;
};

const MAX_ITEMS = 20;

function isOk(res: AnyRec | null | undefined): res is AnyRec {
  if (!res || typeof res !== "object") return false;
  if (res.ok === false) return false;
  if (res.status && res.status !== "OK") return false;
  return true;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim() || undefined;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function asArray(v: unknown): AnyRec[] {
  return Array.isArray(v) ? (v as AnyRec[]) : [];
}

function markersToItems(markers: AiResultMarker[]): ToolResultItem[] {
  return markers.map((m) => ({
    id: m.id,
    title: m.title,
    subtitle: m.desc,
    position: m.position,
    target: m.target,
  }));
}

/** 把單純的地點陣列（含座標）轉成可點飛行的卡片 */
function locationItems(
  items: AnyRec[],
  opts: {
    prefix: string;
    title: (it: AnyRec) => string | undefined;
    subtitle?: (it: AnyRec) => string | undefined;
    badge?: (it: AnyRec) => string | undefined;
    requirePosition?: boolean;
  },
): ToolResultItem[] {
  const out: ToolResultItem[] = [];
  items.slice(0, MAX_ITEMS).forEach((it, i) => {
    const position = getLatLng(it);
    if (opts.requirePosition && !position) return;
    const title = opts.title(it) || "項目";
    out.push({
      id: `${opts.prefix}_${it.id ?? it._id ?? i}`,
      title,
      subtitle: opts.subtitle?.(it),
      badge: opts.badge?.(it),
      position,
    });
  });
  return out;
}

/**
 * 把任一工具的結果正規化成統一的卡片群組；無法渲染時回 null。
 */
export function getToolResultGroup(
  name: string,
  result: unknown,
): ToolResultGroup | null {
  const res = (result ?? {}) as AnyRec;
  if (!isOk(res)) return null;

  switch (name) {
    case "findGooglePlaces": {
      const items = markersToItems(googlePlacesToMarkers(result));
      return items.length
        ? { heading: "周邊地點", icon: "search", items }
        : null;
    }

    case "findA11yPlaces": {
      const items = markersToItems(a11yPlacesToMarkers(result));
      return items.length
        ? { heading: "無障礙設施", icon: "a11y", items }
        : null;
    }

    case "getA11yFacilityDetails": {
      const items = locationItems(asArray(res.facilities), {
        prefix: "a11yfac",
        title: (f) => str(f.name) || str(f.category) || "無障礙設施",
        subtitle: (f) =>
          [str(f.category), str(f.wheelchair)].filter(Boolean).join(" · ") ||
          undefined,
        requirePosition: false,
      });
      return items.length
        ? { heading: "無障礙設施詳情", icon: "a11y", items }
        : null;
    }

    case "findNearbyParking": {
      const items = locationItems(asArray(res.parkingSpots), {
        prefix: "parking",
        title: (p) => str(p.name) || str(p.title) || "身障停車位",
        subtitle: (p) => str(p.address) || str(p.description),
        badge: (p) => {
          const avail = str(p.availableSpaces ?? p.available ?? p.remaining);
          return avail != null ? `剩 ${avail}` : undefined;
        },
        requirePosition: true,
      });
      const total = str(res.total);
      return items.length
        ? {
            heading: "身障停車位",
            icon: "parking",
            items,
            note: total ? `附近共 ${total} 處` : undefined,
          }
        : null;
    }

    case "getNearbyHazards": {
      const reports = asArray(res.data?.reports ?? res.data ?? res.reports);
      const items = locationItems(reports, {
        prefix: "hazard",
        title: (r) =>
          str(r.type) || str(r.category) || str(r.title) || "路況回報",
        subtitle: (r) => str(r.description) || str(r.address) || str(r.status),
        requirePosition: true,
      });
      return items.length
        ? { heading: "附近路況與障礙物", icon: "hazard", items }
        : null;
    }

    case "trackBuses": {
      const items = locationItems(asArray(res.buses), {
        prefix: "bus",
        title: (b) =>
          str(b.plateNumber) || str(b.plate) || str(b.routeName) || "公車",
        subtitle: (b) =>
          [str(b.routeName), str(b.direction ?? b.destination)]
            .filter(Boolean)
            .join(" → ") || undefined,
        badge: (b) =>
          b.isLowFloor || b.lowFloor || b.busType === "低地板"
            ? "低地板"
            : undefined,
        requirePosition: true,
      });
      const count = str(res.count);
      const low = str(res.lowFloorCount);
      const note = [
        count != null ? `共 ${count} 班` : null,
        low != null ? `低地板 ${low} 班` : null,
      ]
        .filter(Boolean)
        .join("，");
      return items.length
        ? {
            heading: "公車即時動態",
            icon: "bus",
            items,
            note: note || undefined,
          }
        : null;
    }

    case "getBusRoute":
    case "getBusRouteDetail": {
      const dirs = asArray(res.directions);
      const stops: AnyRec[] = [];
      for (const d of dirs) {
        for (const s of asArray(d.stops)) {
          stops.push({ ...s, __dir: d.direction ?? d.destination });
        }
      }
      const items = locationItems(stops, {
        prefix: "stop",
        title: (s) => str(s.stopName) || str(s.name) || "站牌",
        subtitle: (s) => {
          const eta = str(
            s.eta ?? s.estimateTime ?? s.estimatedTime ?? s.arrivalTime,
          );
          return (
            [str(s.__dir), eta != null ? `約 ${eta}` : null]
              .filter(Boolean)
              .join(" · ") || undefined
          );
        },
        requirePosition: false,
      });
      const routeName = str(res.routeName) || str(res.routeNo);
      return items.length
        ? {
            heading: routeName ? `公車 ${routeName} 站牌` : "公車站牌",
            icon: "bus",
            items,
          }
        : null;
    }

    case "getBusTimetable": {
      const schedules = asArray(res.schedules);
      const items: ToolResultItem[] = schedules
        .slice(0, MAX_ITEMS)
        .map((s, i) => ({
          id: `sched_${i}`,
          title:
            str(s.time) ||
            str(s.departureTime) ||
            str(s.firstBusTime) ||
            "班次",
          subtitle:
            [str(s.direction ?? s.destination), str(s.note)]
              .filter(Boolean)
              .join(" · ") || undefined,
        }))
        .filter((it) => it.title !== "班次" || it.subtitle);
      const routeName = str(res.routeName);
      return items.length
        ? {
            heading: routeName ? `公車 ${routeName} 時刻表` : "公車時刻表",
            icon: "bus",
            items,
          }
        : null;
    }

    case "getAirQuality": {
      const pm25 = str(res.pm25);
      const quality = str(res.quality);
      const position = getLatLng(res.coordinates ?? res);
      const place = [str(res.city), str(res.area)].filter(Boolean).join(" ");
      if (pm25 == null && quality == null) return null;
      return {
        heading: place ? `空氣品質 · ${place}` : "空氣品質",
        icon: "air",
        note: str(res.advice),
        items: [
          {
            id: "air_0",
            title:
              pm25 != null ? `PM2.5 ${pm25} μg/m³` : (quality ?? "空氣品質"),
            subtitle: quality,
            position,
          },
        ],
      };
    }

    case "getEnvironmentInfo": {
      const items: ToolResultItem[] = [];
      const w = res.weather as AnyRec | undefined;
      if (w) {
        const temp = str(w.temperature ?? w.temp);
        const desc = str(w.description ?? w.weather ?? w.condition);
        const title =
          [temp != null ? `${temp}°C` : null, desc].filter(Boolean).join(" ") ||
          "天氣";
        items.push({
          id: "env_weather",
          title,
          subtitle: str(w.humidity) ? `濕度 ${str(w.humidity)}%` : undefined,
        });
      }
      const aq = res.airQuality as AnyRec | undefined;
      if (aq) {
        const pm25 = str(aq.pm25);
        items.push({
          id: "env_air",
          title: pm25 != null ? `PM2.5 ${pm25}` : "空氣品質",
          subtitle: str(aq.quality),
          position: getLatLng(aq.coordinates ?? aq),
        });
      }
      items.push(
        ...locationItems(asArray(res.nearbyCctv), {
          prefix: "cctv",
          title: (c) => str(c.name) || str(c.title) || "即時影像",
          subtitle: (c) => str(c.address) || str(c.road),
          requirePosition: true,
        }),
      );

      return items.length
        ? { heading: "周邊環境資訊", icon: "env", items }
        : null;
    }

    case "getNavInstructions": {
      const instructions = asArray(res.instructions);
      const items: ToolResultItem[] = instructions
        .slice(0, MAX_ITEMS)
        .map((step, i) => ({
          id: `nav_${i}`,
          title:
            str(step.instruction) ||
            str(step.text) ||
            str(step.description) ||
            `第 ${i + 1} 步`,
          subtitle: str(step.distance) || str(step.streetName),
          position: getLatLng(step),
        }));
      const total = str(res.totalSteps);
      return items.length
        ? {
            heading: "導航指引",
            icon: "nav",
            items,
            note: total ? `共 ${total} 步` : undefined,
          }
        : null;
    }

    default:
      return null;
  }
}
