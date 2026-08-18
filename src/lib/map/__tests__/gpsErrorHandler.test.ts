import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGpsErrorTracker,
  createGpsPositionHandlers,
} from "../gpsErrorHandler";

describe("createGpsErrorTracker", () => {
  it("initializes with hasError = false", () => {
    const tracker = createGpsErrorTracker();
    expect(tracker.hasError()).toBe(false);
  });

  it("triggers notify and returns true on the first error transition", () => {
    const tracker = createGpsErrorTracker();
    const notify = vi.fn();

    const result = tracker.recordError(notify);

    expect(result).toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(tracker.hasError()).toBe(true);
  });

  it("suppresses notifications on subsequent consecutive errors", () => {
    const tracker = createGpsErrorTracker();
    const notify = vi.fn();

    // First error: transitions to error state
    expect(tracker.recordError(notify)).toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);

    // Repeated consecutive errors (e.g. watchPosition firing every 1s without signal)
    for (let i = 0; i < 10; i++) {
      expect(tracker.recordError(notify)).toBe(false);
    }
    expect(notify).toHaveBeenCalledTimes(1);
    expect(tracker.hasError()).toBe(true);
  });

  it("resets error state on recordSuccess and allows notification on subsequent error", () => {
    const tracker = createGpsErrorTracker();
    const notify = vi.fn();

    // 1. Initial error occurs
    tracker.recordError(notify);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(tracker.hasError()).toBe(true);

    // 2. GPS fix acquired (recovery)
    tracker.recordSuccess();
    expect(tracker.hasError()).toBe(false);

    // 3. New error occurs (e.g. user enters basement again)
    const result = tracker.recordError(notify);
    expect(result).toBe(true);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(tracker.hasError()).toBe(true);
  });

  it("resets error state via reset()", () => {
    const tracker = createGpsErrorTracker();
    tracker.recordError();
    expect(tracker.hasError()).toBe(true);

    tracker.reset();
    expect(tracker.hasError()).toBe(false);
  });
});

describe("createGpsPositionHandlers", () => {
  let mockStorage: Record<string, string>;
  let storage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };

  beforeEach(() => {
    mockStorage = {};
    storage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
    };
  });

  const createMockPosition = (
    lat: number,
    lng: number,
    heading: number | null = null,
  ): GeolocationPosition =>
    ({
      coords: {
        latitude: lat,
        longitude: lng,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    }) as unknown as GeolocationPosition;

  it("handles valid position updates and writes to storage", () => {
    const onLocationUpdate = vi.fn();
    const onHeadingUpdate = vi.fn();

    const { handlePosition } = createGpsPositionHandlers({
      onLocationUpdate,
      onHeadingUpdate,
      storage,
    });

    const pos = createMockPosition(25.033, 121.565, 180);
    handlePosition(pos);

    expect(onLocationUpdate).toHaveBeenCalledWith({
      lat: 25.033,
      lng: 121.565,
    });
    expect(onHeadingUpdate).toHaveBeenCalledWith(180);
    expect(mockStorage.lastUserLocation).toBe(
      JSON.stringify({ lat: 25.033, lng: 121.565 }),
    );
  });

  it("handles heading with null or NaN correctly", () => {
    const onLocationUpdate = vi.fn();
    const onHeadingUpdate = vi.fn();

    const { handlePosition } = createGpsPositionHandlers({
      onLocationUpdate,
      onHeadingUpdate,
      storage,
    });

    handlePosition(createMockPosition(25.033, 121.565, Number.NaN));
    expect(onHeadingUpdate).toHaveBeenLastCalledWith(null);

    handlePosition(createMockPosition(25.033, 121.565, null));
    expect(onHeadingUpdate).toHaveBeenLastCalledWith(null);
  });

  it("handles storage write failures gracefully without throwing", () => {
    const onLocationUpdate = vi.fn();
    const failingStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };

    const { handlePosition } = createGpsPositionHandlers({
      onLocationUpdate,
      storage: failingStorage,
    });

    expect(() => {
      handlePosition(createMockPosition(25.033, 121.565));
    }).not.toThrow();
    expect(onLocationUpdate).toHaveBeenCalledWith({
      lat: 25.033,
      lng: 121.565,
    });
  });

  it("notifies error on first failure and suppresses consecutive errors", () => {
    const onLocationUpdate = vi.fn();
    const onErrorNotification = vi.fn();

    const { handlePosition, handleError, tracker } = createGpsPositionHandlers({
      onLocationUpdate,
      onErrorNotification,
      storage,
    });

    const mockError = {
      code: 1, // PERMISSION_DENIED
      message: "User denied Geolocation",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError;

    // First error: notification fired
    handleError(mockError);
    expect(onErrorNotification).toHaveBeenCalledTimes(1);
    expect(onErrorNotification).toHaveBeenCalledWith(mockError);
    expect(tracker.hasError()).toBe(true);

    // Repeated consecutive errors: notification suppressed
    handleError(mockError);
    handleError(mockError);
    handleError(mockError);
    expect(onErrorNotification).toHaveBeenCalledTimes(1);

    // Position recovery: resets error state
    handlePosition(createMockPosition(25.033, 121.565));
    expect(tracker.hasError()).toBe(false);

    // Subsequent error: notification fired again
    handleError(mockError);
    expect(onErrorNotification).toHaveBeenCalledTimes(2);
  });
});
