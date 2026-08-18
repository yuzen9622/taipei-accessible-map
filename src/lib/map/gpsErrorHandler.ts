/**
 * State-transition GPS error tracker and position handlers.
 *
 * Prevents toast notification spam when `navigator.geolocation.watchPosition`
 * continuously fires error callbacks (e.g. in tunnels, basements, or when
 * location permission is denied).
 *
 * Notifications are only dispatched on the transition from a healthy/initial
 * state to an error state. Once a valid GPS fix is received, the error state
 * is reset so future signal losses will trigger a single notification again.
 */

import type { LatLng } from "@/types";

export interface GpsErrorTracker {
  /** Record a successful GPS position fix; resets the error state. */
  recordSuccess: () => void;
  /**
   * Record a GPS error. Calls `notify` ONLY if transitioning into the error state.
   * Returns `true` if this was a new error transition, `false` if suppressed.
   */
  recordError: (notify?: () => void) => boolean;
  /** Check whether the tracker is currently in an error state. */
  hasError: () => boolean;
  /** Explicitly reset the error state. */
  reset: () => void;
}

/**
 * Creates a state-transition GPS error tracker instance.
 */
export function createGpsErrorTracker(): GpsErrorTracker {
  let isErrorActive = false;

  return {
    recordSuccess: () => {
      isErrorActive = false;
    },
    recordError: (notify?: () => void) => {
      if (!isErrorActive) {
        isErrorActive = true;
        notify?.();
        return true;
      }
      return false;
    },
    hasError: () => isErrorActive,
    reset: () => {
      isErrorActive = false;
    },
  };
}

export interface GpsPositionHandlersOptions {
  onLocationUpdate: (loc: LatLng) => void;
  onHeadingUpdate?: (heading: number | null) => void;
  onErrorNotification?: (error?: GeolocationPositionError) => void;
  storageKey?: string;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  tracker?: GpsErrorTracker;
}

/**
 * Creates coordinated position and error handlers for navigator.geolocation.
 */
export function createGpsPositionHandlers(options: GpsPositionHandlersOptions) {
  const {
    onLocationUpdate,
    onHeadingUpdate,
    onErrorNotification,
    storageKey = "lastUserLocation",
    storage = typeof window !== "undefined" ? window.localStorage : null,
    tracker = createGpsErrorTracker(),
  } = options;

  const handlePosition = (pos: GeolocationPosition) => {
    tracker.recordSuccess();

    const loc: LatLng = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
    onLocationUpdate(loc);

    if (storage) {
      try {
        storage.setItem(storageKey, JSON.stringify(loc));
      } catch (_err) {
        // localStorage write failure (e.g. private browsing or quota exceeded) is non-fatal.
      }
    }

    if (onHeadingUpdate) {
      const h = pos.coords.heading;
      onHeadingUpdate(typeof h === "number" && !Number.isNaN(h) ? h : null);
    }
  };

  const handleError = (error?: GeolocationPositionError) => {
    tracker.recordError(() => {
      onErrorNotification?.(error);
    });
  };

  return {
    handlePosition,
    handleError,
    tracker,
  };
}
