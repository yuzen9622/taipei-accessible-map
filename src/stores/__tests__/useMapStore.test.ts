import { beforeEach, describe, expect, it } from "vitest";
import useMapStore from "@/stores/useMapStore";

describe("useMapStore mobileSheetSnap", () => {
  beforeEach(() => {
    useMapStore.setState({
      mobileSheetSnap: "peek",
      sheetMode: "home",
      chatOpen: false,
    });
  });

  it("defaults to peek snap", () => {
    expect(useMapStore.getState().mobileSheetSnap).toBe("peek");
  });

  it("updates snap to full when setMobileSheetSnap is called", () => {
    useMapStore.getState().setMobileSheetSnap("full");
    expect(useMapStore.getState().mobileSheetSnap).toBe("full");
  });

  it("updates snap to half when setMobileSheetSnap is called", () => {
    useMapStore.getState().setMobileSheetSnap("half");
    expect(useMapStore.getState().mobileSheetSnap).toBe("half");
  });
});
