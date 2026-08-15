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
  formatAlertTime,
  getAlertStatusLabelKey,
  getAlertTier,
  LegAlertNotice,
  MetroAlertsBanner,
} from "@/components/shared/TransitAlerts";
import type { MetroAlert } from "@/types/route";

const ACTIVE_ALERT: MetroAlert = {
  alertId: "TRTC-2026081501",
  title: "電梯故障",
  description: "R10 中山站電梯維修中",
  status: 2,
  stations: [{ id: "R10", name: "中山站" }],
  lines: ["R"],
  publishTime: "2026-08-15T09:30:00+08:00",
  updateTime: "2026-08-15T09:45:00+08:00",
};

// --- Pure helpers -----------------------------------------------------------

describe("getAlertTier", () => {
  it("maps 2 to active and 1 to upcoming", () => {
    expect(getAlertTier(2)).toBe("active");
    expect(getAlertTier(1)).toBe("upcoming");
  });

  it("maps anything else to unknown", () => {
    expect(getAlertTier(0)).toBe("unknown");
    expect(getAlertTier(3)).toBe("unknown");
  });
});

describe("getAlertStatusLabelKey", () => {
  it("maps active/upcoming to i18n keys and unknown to null", () => {
    expect(getAlertStatusLabelKey("active")).toBe("alertStatusActive");
    expect(getAlertStatusLabelKey("upcoming")).toBe("alertStatusUpcoming");
    expect(getAlertStatusLabelKey("unknown")).toBeNull();
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

  it("renders the first alert title collapsed and expands to details", () => {
    const html = renderToStaticMarkup(
      React.createElement(LegAlertNotice, { alerts: [ACTIVE_ALERT] }),
    );
    expect(html).toContain("電梯故障");
    expect(html).toContain("實施中");
    expect(html).toContain("中山站");
    expect(html).toContain("R10");
    // Collapsed by default: description is hidden in the 0fr grid.
    expect(html).toContain("電梯維修中");
    expect(html).toContain('aria-expanded="false"');
  });

  it("shows a +N badge when a leg carries multiple alerts", () => {
    const html = renderToStaticMarkup(
      React.createElement(LegAlertNotice, {
        alerts: [
          ACTIVE_ALERT,
          { ...ACTIVE_ALERT, alertId: "TRTC-2026081502", title: "列車延誤" },
        ],
      }),
    );
    expect(html).toContain("電梯故障");
    expect(html).toContain("+1");
  });

  it("uses the sky tone for upcoming (status 1) alerts", () => {
    const html = renderToStaticMarkup(
      React.createElement(LegAlertNotice, {
        alerts: [{ ...ACTIVE_ALERT, status: 1 }],
      }),
    );
    expect(html).toContain("尚未實施");
    expect(html).toContain("bg-sky-500/10");
    expect(html).toContain("border-sky-500/30");
  });
});

describe("MetroAlertsBanner", () => {
  it("renders nothing for an empty array", () => {
    expect(
      renderToStaticMarkup(
        React.createElement(MetroAlertsBanner, { alerts: [] }),
      ),
    ).toBe("");
  });

  it("shows the count, systems, and grouped alerts", () => {
    const html = renderToStaticMarkup(
      React.createElement(MetroAlertsBanner, {
        alerts: [
          {
            railSystem: "TRTC",
            updatedAt: "2026-08-15T10:00:00+08:00",
            alerts: [ACTIVE_ALERT],
          },
        ],
      }),
    );
    expect(html).toContain("營運公告");
    expect(html).toContain("共 1 則");
    expect(html).toContain("TRTC");
    expect(html).toContain("電梯故障");
  });

  it("tallies alerts across multiple systems", () => {
    const html = renderToStaticMarkup(
      React.createElement(MetroAlertsBanner, {
        alerts: [
          {
            railSystem: "TRTC",
            updatedAt: "",
            alerts: [ACTIVE_ALERT, { ...ACTIVE_ALERT, alertId: "T2" }],
          },
          {
            railSystem: "NTMC",
            updatedAt: "",
            alerts: [{ ...ACTIVE_ALERT, alertId: "N1" }],
          },
        ],
      }),
    );
    expect(html).toContain("共 3 則");
    expect(html).toContain("TRTC、NTMC");
  });
});
