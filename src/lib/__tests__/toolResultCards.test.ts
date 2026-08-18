import { describe, expect, it } from "vitest";
import {
  getAggregatedToolResults,
  getToolResultGroup,
} from "../toolResultCards";

describe("toolResultCards", () => {
  describe("getToolResultGroup", () => {
    it("should parse trackBuses results correctly", () => {
      const result = {
        ok: true,
        buses: [
          {
            plateNumb: "028-U3",
            routeName: "284",
            directionLabel: "往大安森林公園",
            stopsAway: 2,
            isLowFloor: "1",
            lat: 25.03,
            lng: 121.53,
          },
        ],
        count: 1,
        lowFloorCount: 1,
      };

      const group = getToolResultGroup("trackBuses", result);
      expect(group).not.toBeNull();
      expect(group?.heading).toBe("公車即時動態");
      expect(group?.icon).toBe("bus");
      expect(group?.items).toHaveLength(1);
      expect(group?.items[0].title).toBe("284 · 028-U3");
      expect(group?.items[0].badge).toBe("低地板");
    });
  });

  describe("getAggregatedToolResults", () => {
    it("should return empty array for empty activities", () => {
      expect(getAggregatedToolResults([])).toEqual([]);
      expect(getAggregatedToolResults(undefined)).toEqual([]);
    });

    it("should ignore running activities", () => {
      const activities = [
        {
          name: "trackBuses",
          status: "running",
          result: {
            ok: true,
            buses: [{ plateNumb: "028-U3", lat: 25.03, lng: 121.53 }],
          },
        },
      ];
      expect(getAggregatedToolResults(activities)).toEqual([]);
    });

    it("should aggregate and deduplicate multiple trackBuses activities into a single group", () => {
      const activities = [
        {
          name: "trackBuses",
          status: "done",
          result: {
            ok: true,
            buses: [
              {
                plateNumb: "028-U3",
                routeName: "284",
                lat: 25.03,
                lng: 121.53,
              },
              {
                plateNumb: "079-U3",
                routeName: "284",
                lat: 25.04,
                lng: 121.54,
              },
            ],
            count: 2,
          },
        },
        {
          name: "trackBuses",
          status: "done",
          result: {
            ok: true,
            buses: [
              // 重複的車牌 028-U3
              {
                plateNumb: "028-U3",
                routeName: "284",
                lat: 25.03,
                lng: 121.53,
              },
              // 新車牌
              {
                plateNumb: "167-U3",
                routeName: "信義幹線",
                lat: 25.05,
                lng: 121.55,
              },
            ],
            count: 2,
          },
        },
      ];

      const groups = getAggregatedToolResults(activities);
      expect(groups).toHaveLength(1);
      expect(groups[0].heading).toBe("公車即時動態");
      // 總共應該有 3 筆不重複的公車
      expect(groups[0].items).toHaveLength(3);
      expect(groups[0].items.map((i) => i.title)).toEqual([
        "284 · 028-U3",
        "284 · 079-U3",
        "信義幹線 · 167-U3",
      ]);
    });

    it("should separate different tool types into distinct groups", () => {
      const activities = [
        {
          name: "trackBuses",
          status: "done",
          result: {
            ok: true,
            buses: [
              {
                plateNumb: "028-U3",
                routeName: "284",
                lat: 25.03,
                lng: 121.53,
              },
            ],
          },
        },
        {
          name: "findGooglePlaces",
          status: "done",
          result: {
            places: [
              {
                id: "place_1",
                displayName: { text: "大安森林公園" },
                location: { latitude: 25.03, longitude: 121.53 },
              },
            ],
          },
        },
      ];

      const groups = getAggregatedToolResults(activities);
      expect(groups).toHaveLength(2);
      expect(groups[0].heading).toBe("公車即時動態");
      expect(groups[1].heading).toBe("周邊地點");
    });
  });
});
