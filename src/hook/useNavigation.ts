"use client";

import { useEffect, useRef } from "react";
import { useAppTranslation } from "@/i18n/client";
import { getRouteInstructions } from "@/lib/api/a11y";
import {
  buildCumulativePath,
  type CumulativePath,
  haversineMeters,
  normalizeDeg,
  projectToPath,
  resolveWaypoints,
  shortestAngleLerp,
  type Waypoint,
} from "@/lib/geo";
import useMapStore from "@/stores/useMapStore";
import useNavStore, { type HeadingSource } from "@/stores/useNavStore";

// Tuning constants for the turn-by-turn engine.
const ARRIVE_THRESHOLD_M = 18; // pass within this of a maneuver → advance step
const FINAL_ARRIVE_THRESHOLD_M = 25; // within this of the destination → arrived
const OFF_ROUTE_M = 40; // perpendicular distance from route to flag off-route
const OFF_ROUTE_HITS = 3; // consecutive off-route samples before flagging
const MANUAL_LOCK_MS = 8000; // honor a manual step change for this long
const CAMERA_THROTTLE_MS = 350;
const HEADING_WRITE_MS = 200;
const COMPASS_FRESH_MS = 1500;
const NAV_PITCH = 60;
const SMOOTH_FACTOR = 0.25;

/** True on iOS 13+, where DeviceOrientation needs an explicit permission grant. */
function compassNeedsPermission(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (
      DeviceOrientationEvent as unknown as { requestPermission?: unknown }
    )?.requestPermission === "function"
  );
}

/**
 * The single turn-by-turn navigation engine. Mounted (via NavigationController)
 * only while `isNavigating` is true. It loads instructions, auto-advances steps
 * from GPS, tracks heading (compass → GPS fallback), and imperatively drives the
 * map camera to follow + rotate. All high-frequency output goes to useNavStore;
 * the camera is driven via the map instance directly to avoid React re-renders.
 */
export default function useNavigation() {
  const { i18n } = useAppTranslation();
  const lang = i18n.language === "en" ? "en" : "zh-TW";

  const route = useMapStore((s) => s.selectRoute?.route ?? null);
  const userLocation = useMapStore((s) => s.userLocation);
  const compassPermission = useNavStore((s) => s.compassPermission);

  const pathRef = useRef<CumulativePath | null>(null);
  const waypointsRef = useRef<Waypoint[]>([]);
  const offHitsRef = useRef(0);

  // Heading working state (kept in refs; written to the store throttled).
  const compassRef = useRef<number | null>(null);
  const compassTsRef = useRef(0);
  const smoothRef = useRef<number | null>(null);

  // ---- Load instructions when navigation starts (passthrough legs only) ----
  useEffect(() => {
    if (!route) return;
    let cancelled = false;
    getRouteInstructions({
      route: { legs: route.legs },
      language: lang,
    })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data?.instructions) {
          const cp = buildCumulativePath(route.legs);
          pathRef.current = cp;
          waypointsRef.current = resolveWaypoints(res.data.instructions, cp);
          useNavStore.getState().setInstructions(res.data.instructions);
          if (process.env.NODE_ENV !== "production") {
            // Verify polylineIndex → coordinate mapping against real data.
            console.debug(
              "[nav] instructions loaded",
              res.data.instructions.length,
              "pts:",
              cp.path.length,
              "waypoints:",
              waypointsRef.current.map((w) => w.alongM.toFixed(0)),
            );
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [route, lang]);

  // ---- Progress: project user onto route → advance step, distance, off-route ----
  useEffect(() => {
    if (!userLocation) return;
    const cp = pathRef.current;
    const wps = waypointsRef.current;
    if (!cp || cp.path.length === 0 || wps.length === 0) return;

    const nav = useNavStore.getState();
    const proj = projectToPath(userLocation, cp.path, cp.cumM);

    // Off-route: require a few consecutive far samples before flagging.
    if (proj.perpDistM > OFF_ROUTE_M) {
      offHitsRef.current += 1;
      if (offHitsRef.current >= OFF_ROUTE_HITS && !nav.isOffRoute) {
        nav.setIsOffRoute(true);
      }
    } else {
      offHitsRef.current = 0;
      if (nav.isOffRoute) nav.setIsOffRoute(false);
    }

    // Next maneuver = first waypoint still ahead of the user along the route.
    let nextIdx = wps.findIndex(
      (w) => w.alongM > proj.alongM + ARRIVE_THRESHOLD_M,
    );
    if (nextIdx === -1) nextIdx = wps.length - 1;

    // Auto-advance forward only; honor a recent manual override briefly.
    const manualActive = Date.now() - nav.lastManualTs < MANUAL_LOCK_MS;
    const displayIdx =
      !manualActive && nextIdx > nav.currentStepIndex
        ? nextIdx
        : nav.currentStepIndex;
    if (displayIdx !== nav.currentStepIndex)
      nav.setCurrentStepIndex(displayIdx);

    const target = wps[Math.min(displayIdx, wps.length - 1)];
    nav.setDistanceToNextM(
      target ? Math.max(0, target.alongM - proj.alongM) : null,
    );

    // Arrival: close to the final maneuver point.
    const finalWp = wps[wps.length - 1];
    if (
      finalWp?.coord &&
      haversineMeters(userLocation, finalWp.coord) < FINAL_ARRIVE_THRESHOLD_M
    ) {
      if (!nav.arrived) nav.setArrived(true);
    }
  }, [userLocation]);

  // ---- Compass listener (re-attaches when iOS permission flips to granted) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    // On iOS we only attach once granted; elsewhere no permission is needed.
    if (compassNeedsPermission() && compassPermission !== "granted") return;

    const handler = (e: DeviceOrientationEvent) => {
      let h: number | null = null;
      const webkit = (e as unknown as { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (typeof webkit === "number" && !Number.isNaN(webkit)) {
        h = webkit; // iOS: already clockwise from true north
      } else if (e.absolute && typeof e.alpha === "number") {
        h = normalizeDeg(360 - e.alpha); // alpha is counterclockwise from north
      }
      if (h != null) {
        compassRef.current = h;
        compassTsRef.current = Date.now();
      }
    };

    const evt =
      "ondeviceorientationabsolute" in window
        ? "deviceorientationabsolute"
        : "deviceorientation";
    window.addEventListener(evt, handler as EventListener);
    return () => window.removeEventListener(evt, handler as EventListener);
  }, [compassPermission]);

  // ---- Camera + heading loop: follow user, rotate to heading (throttled) ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    let rafId = 0;
    let lastCamTs = 0;
    let lastHeadingTs = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      // Stop touching the camera the instant navigation ends (before unmount).
      if (!useMapStore.getState().isNavigating) return;

      const now = Date.now();
      const map = useMapStore.getState().map;
      const loc = useMapStore.getState().userLocation;
      if (!map) return;

      // Resolve heading: fresh compass wins, else GPS course-over-ground.
      let raw: number | null = null;
      let source: HeadingSource = null;
      if (
        compassRef.current != null &&
        now - compassTsRef.current < COMPASS_FRESH_MS
      ) {
        raw = compassRef.current;
        source = "compass";
      } else {
        const g = useNavStore.getState().gpsHeading;
        if (g != null) {
          raw = g;
          source = "gps";
        }
      }

      let smoothed: number | null = smoothRef.current;
      if (raw != null) {
        smoothed = shortestAngleLerp(
          smoothRef.current ?? raw,
          raw,
          SMOOTH_FACTOR,
        );
        smoothRef.current = smoothed;
        if (now - lastHeadingTs > HEADING_WRITE_MS) {
          useNavStore.getState().setUserHeading(Math.round(smoothed), source);
          lastHeadingTs = now;
        }
      }

      if (loc && now - lastCamTs > CAMERA_THROTTLE_MS) {
        // 3D: heading-up tilted follow. 2D: flat north-up plane, still
        // centered on the user.
        const is3D = useMapStore.getState().is3D;
        map.easeTo({
          center: [loc.lng, loc.lat],
          bearing: is3D ? (smoothed != null ? smoothed : map.getBearing()) : 0,
          pitch: is3D ? NAV_PITCH : 0,
          duration: CAMERA_THROTTLE_MS,
        });
        lastCamTs = now;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ---- Reset runtime state when navigation ends (controller unmounts) ----
  useEffect(() => {
    return () => {
      useNavStore.getState().reset();
    };
  }, []);
}
