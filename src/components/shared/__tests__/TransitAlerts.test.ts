import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Same stubs as RouteCard.test.ts — `useAppTranslation` calls `usePathname()`
// which throws outside a mounted Next.js app router.
vi.mock("next/navigation", () => ({
  usePathname: () => "/zh-TW",
  redirect: () => {},
}));

import {
  formatAlertDate,
  formatAlertDateRange,
  formatAlertTime,
  getAlertStatusLabelKey,
  getAlertTier,
  getMatchKindLabelKey,
  isMetroAlert,
  LegAlertNotice,
  MetroAlertsBanner,
  TransitAlertsBanner,
} from "@/components/shared/TransitAlerts";
import type { MetroAlertResult } from "@/types/route";
import type { MatchedAlert, MetroAlert } from "@/types/transit-alert";

const ACTIVE_METRO_ALERT: MetroAlert = {
  alertId: "TRTC-2026081501",
  title: "電梯故障",
  description: "R10 中山站電梯維修中",
  status: 2,
  stations: [{ id: "R10", name: "中山站" }],
  lines: ["R"],
  publishTime: "2026-08-15T09:30:00+08:00",
  updateTime: "2026-08-15T09:45:00+08:00",
};

const BUS_MATCHED_ALERT: MatchedAlert = {
  alertId: "BUS-2026082701",
  title: "配合施工改道",
  description: "8/27~8/30 施工改道，不停靠中正路站。",
  status: "active",
  matchKind: "route",
  reason: "道路施工",
  startTime: "2026-08-27T08:00:00+08:00",
  endTime: "2026-08-30T18:00:00+08:00",
  alertUrl: "https://example.com/bus-alert",
};

// --- Pure helpers -----------------------------------------------------------

describe("getAlertTier", () => {
  it("maps numeric 2 and 1", () => {
    expect(getAlertTier(2)).toBe("active");
    expect(getAlertTier(1)).toBe("upcoming");
  });

  it("maps string '2', 'active', 'in_effect' to active", () => {
    expect(getAlertTier("2")).toBe("active");
    expect(getAlertTier("active")).toBe("active");
    expect(getAlertTier("in_effect")).toBe("active");
  });

  it("maps string '1', 'upcoming' to upcoming", () => {
    expect(getAlertTier("1")).toBe("upcoming");
    expect(getAlertTier("upcoming")).toBe("upcoming");
  });

  it("maps anything else to unknown", () => {
    expect(getAlertTier(0)).toBe("unknown");
    expect(getAlertTier(3)).toBe("unknown");
    expect(getAlertTier(undefined)).toBe("unknown");
    expect(getAlertTier(null)).toBe("unknown");
    expect(getAlertTier("other")).toBe("unknown");
  });
});

describe("getAlertStatusLabelKey", () => {
  it("maps active/upcoming to i18n keys and unknown to null", () => {
    expect(getAlertStatusLabelKey("active")).toBe("alertStatusActive");
    expect(getAlertStatusLabelKey("upcoming")).toBe("alertStatusUpcoming");
    expect(getAlertStatusLabelKey("unknown")).toBeNull();
  });
});

describe("getMatchKindLabelKey", () => {
  it("maps all MatchKind variants to their i18n key", () => {
    expect(getMatchKindLabelKey("route")).toBe("alertMatchRoute");
    expect(getMatchKindLabelKey("stop")).toBe("alertMatchStop");
    expect(getMatchKindLabelKey("station")).toBe("alertMatchStation");
    expect(getMatchKindLabelKey("line")).toBe("alertMatchLine");
    expect(getMatchKindLabelKey("train")).toBe("alertMatchTrain");
    expect(getMatchKindLabelKey("section")).toBe("alertMatchSection");
    expect(getMatchKindLabelKey(undefined)).toBeNull();
  });
});

describe("formatAlertTime", () => {
  it("returns HH:mm for a time today", () => {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T10:05:00+08:00`;
    expect(formatAlertTime(iso)).toBe("10:05");
  });

  it("returns M/D HH:mm for another day", () => {
    const iso = "2026-08-14T10:05:00+08:00";
    expect(formatAlertTime(iso)).toBe("8/14 10:05");
  });

  it("falls back to the raw string when the date is invalid", () => {
    expect(formatAlertTime("not-a-date")).toBe("not-a-date");
  });
});

describe("formatAlertDate and formatAlertDateRange", () => {
  it("formats date strings properly", () => {
    expect(formatAlertDate("2026-08-27T08:00:00+08:00")).toBe("8/27 08:00");
    expect(formatAlertDate(undefined)).toBeNull();
  });

  it("formats date ranges with start and end", () => {
    const range = formatAlertDateRange(
      "2026-08-27T08:00:00+08:00",
      "2026-08-30T18:00:00+08:00",
    );
    expect(range).toBe("8/27 08:00 ~ 8/30 18:00");
  });

  it("formats open-ended start or end ranges", () => {
    expect(formatAlertDateRange("2026-08-27T08:00:00+08:00", null)).toBe(
      "8/27 08:00 起",
    );
    expect(formatAlertDateRange(null, "2026-08-30T18:00:00+08:00")).toBe(
      "至 8/30 18:00",
    );
    expect(formatAlertDateRange(null, null)).toBeNull();
  });
});

describe("isMetroAlert", () => {
  it("identifies MetroAlert by stations or lines", () => {
    expect(isMetroAlert(ACTIVE_METRO_ALERT)).toBe(true);
    expect(isMetroAlert(BUS_MATCHED_ALERT)).toBe(false);
  });
});

// --- Rendering --------------------------------------------------------------

describe("LegAlertNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when alerts are absent or empty", () => {
    expect(renderToStaticMarkup(React.createElement(LegAlertNotice))).toBe("");
    expect(
      renderToStaticMarkup(React.createElement(LegAlertNotice, { alerts: [] })),
    ).toBe("");
  });

  it("renders a MetroAlert collapsed and expands to details", () => {
    const html = renderToStaticMarkup(
      React.createElement(LegAlertNotice, { alerts: [ACTIVE_METRO_ALERT] }),
    );
    expect(html).toContain("電梯故障");
    expect(html).toContain("實施中");
    expect(html).toContain("中山站");
    expect(html).toContain("R10");
    // Collapsed by default: description is hidden in the 0fr grid.
    expect(html).toContain("電梯維修中");
    expect(html).toContain('aria-expanded="false"');
  });

  it("renders a MatchedAlert with matchKind, reason, date range and link", () => {
    const html = renderToStaticMarkup(
      React.createElement(LegAlertNotice, { alerts: [BUS_MATCHED_ALERT] }),
    );
    expect(html).toContain("配合施工改道");
    expect(html).toContain("8/27~8/30 施工改道，不停靠中正路站。");
    expect(html).toContain("實施中");
    expect(html).toContain("路線"); // matchKind: route
    expect(html).toContain("道路施工"); // reason
    expect(html).toContain("8/27 08:00 ~ 8/30 18:00"); // time range
    expect(html).toContain("https://example.com/bus-alert"); // alertUrl
  });

  it("shows a +N badge when a leg carries multiple alerts", () => {
    const html = renderToStaticMarkup(
      React.createElement(LegAlertNotice, {
        alerts: [
          ACTIVE_METRO_ALERT,
          {
            ...ACTIVE_METRO_ALERT,
            alertId: "TRTC-2026081502",
            title: "列車延誤",
          },
        ],
      }),
    );
    expect(html).toContain("電梯故障");
    expect(html).toContain("+1");
  });

  it("uses the sky tone for upcoming (status 1) alerts", () => {
    const html = renderToStaticMarkup(
      React.createElement(LegAlertNotice, {
        alerts: [{ ...ACTIVE_METRO_ALERT, status: 1 }],
      }),
    );
    expect(html).toContain("尚未實施");
    expect(html).toContain("bg-sky-500/10");
    expect(html).toContain("border-sky-500/30");
  });
});

describe("MetroAlertsBanner and TransitAlertsBanner", () => {
  it("renders nothing for empty arrays", () => {
    expect(
      renderToStaticMarkup(
        React.createElement(MetroAlertsBanner, { alerts: [] }),
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        React.createElement(TransitAlertsBanner, {
          metroAlerts: [],
          transitAlerts: [],
        }),
      ),
    ).toBe("");
  });

  it("shows the count, systems, and grouped alerts for MetroAlertResult", () => {
    const alerts: MetroAlertResult[] = [
      {
        railSystem: "TRTC",
        updatedAt: "2026-08-15T10:00:00+08:00",
        alerts: [ACTIVE_METRO_ALERT],
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(MetroAlertsBanner, { alerts }),
    );
    expect(html).toContain("營運公告");
    expect(html).toContain("共 1 則");
    expect(html).toContain("TRTC");
    expect(html).toContain("電梯故障");
  });

  it("tallies alerts across both metroAlerts and transitAlerts", () => {
    const metroAlerts: MetroAlertResult[] = [
      {
        railSystem: "TRTC",
        updatedAt: "",
        alerts: [ACTIVE_METRO_ALERT, { ...ACTIVE_METRO_ALERT, alertId: "T2" }],
      },
    ];
    const transitAlerts: MatchedAlert[] = [BUS_MATCHED_ALERT];

    const html = renderToStaticMarkup(
      React.createElement(TransitAlertsBanner, {
        metroAlerts,
        transitAlerts,
      }),
    );
    expect(html).toContain("共 3 則");
    expect(html).toContain("TRTC");
    expect(html).toContain("電梯故障");
    expect(html).toContain("配合施工改道");
  });
});
