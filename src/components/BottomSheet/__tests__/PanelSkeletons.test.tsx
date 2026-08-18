import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  A11yPanelSkeleton,
  BusPanelSkeleton,
  ChatSkeleton,
  EnvironmentSkeleton,
  HazardReportSkeleton,
  NavigationSkeleton,
  PanelSkeleton,
  ParkingPanelSkeleton,
  PlaceSkeleton,
  RouteContentSkeleton,
  RoutePlanSkeleton,
  SavedPlacesSkeleton,
  StationDetailSkeleton,
  WelfareSkeleton,
} from "../PanelSkeletons";

// Mock i18n
vi.mock("@/i18n/client", () => ({
  useAppTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "zh-TW" },
  }),
}));

describe("PanelSkeletons Accessibility & Structure", () => {
  it("PanelSkeleton renders with role=status, aria-busy=true and pulse animation", () => {
    const html = renderToStaticMarkup(<PanelSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("animate-pulse");
    expect(html).toContain("sr-only");
  });

  it("A11yPanelSkeleton renders accessibility label and skeleton chips", () => {
    const html = renderToStaticMarkup(<A11yPanelSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("無障礙設施");
    expect(html).toContain("animate-pulse");
  });

  it("BusPanelSkeleton renders bus info label and search placeholder", () => {
    const html = renderToStaticMarkup(<BusPanelSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("公車資訊");
  });

  it("ParkingPanelSkeleton renders parking label", () => {
    const html = renderToStaticMarkup(<ParkingPanelSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("停車資訊");
  });

  it("EnvironmentSkeleton renders environment label and grid", () => {
    const html = renderToStaticMarkup(<EnvironmentSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("環境資訊");
    expect(html).toContain("grid-cols-2");
  });

  it("HazardReportSkeleton renders hazard report label and photo upload wireframe", () => {
    const html = renderToStaticMarkup(<HazardReportSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("回報障礙");
  });

  it("SavedPlacesSkeleton renders saved places label", () => {
    const html = renderToStaticMarkup(<SavedPlacesSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("已存地點");
  });

  it("WelfareSkeleton renders welfare label", () => {
    const html = renderToStaticMarkup(<WelfareSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("福利資源");
  });

  it("PlaceSkeleton renders place detail wireframe with 44px min touch buttons", () => {
    const html = renderToStaticMarkup(<PlaceSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("grid-cols-4");
    expect(html).toContain("h-11");
  });

  it("RoutePlanSkeleton renders route planning inputs wireframe", () => {
    const html = renderToStaticMarkup(<RoutePlanSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("規劃路線");
  });

  it("RouteContentSkeleton renders route calculation wireframe", () => {
    const html = renderToStaticMarkup(<RouteContentSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("路線");
  });

  it("NavigationSkeleton renders navigation instructions wireframe", () => {
    const html = renderToStaticMarkup(<NavigationSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("導航指引");
  });

  it("StationDetailSkeleton renders station detail wireframe", () => {
    const html = renderToStaticMarkup(<StationDetailSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("車站詳情");
  });

  it("ChatSkeleton renders AI chatbot conversation wireframe", () => {
    const html = renderToStaticMarkup(<ChatSkeleton />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("AI 助理");
  });
});
