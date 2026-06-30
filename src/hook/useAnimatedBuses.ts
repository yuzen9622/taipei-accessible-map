import { useEffect, useRef, useState } from "react";
import { bearingDeg } from "@/lib/geo";
import type { LiveBus } from "@/types/route";

export interface AnimatedBus extends LiveBus {
  /** Compass heading (deg, 0 = north) inferred from the last move. */
  bearing: number;
}

interface Tween {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  bearing: number;
}

const DEFAULT_DURATION = 1200;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * Smoothly interpolates bus marker positions between the discrete 15s polls so
 * vehicles glide along the road instead of teleporting.
 *
 * Each time `buses` changes we tween every vehicle from where it is currently
 * drawn to its new coordinate over `durationMs` using requestAnimationFrame,
 * then stop ticking until the next update (idle between polls). Vehicles are
 * matched across updates by plate number; new plates appear instantly at their
 * reported position and vanished plates are dropped.
 */
export function useAnimatedBuses(
  buses: LiveBus[],
  durationMs: number = DEFAULT_DURATION,
): AnimatedBus[] {
  const [frame, setFrame] = useState<AnimatedBus[]>([]);
  const rafRef = useRef<number | null>(null);
  // Where each plate is currently *drawn* (updated every animation frame).
  const drawnRef = useRef<
    Map<string, { lat: number; lng: number; bearing: number }>
  >(new Map());

  useEffect(() => {
    const cancelRaf = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    if (buses.length === 0) {
      cancelRaf();
      drawnRef.current.clear();
      setFrame([]);
      return;
    }

    const drawn = drawnRef.current;

    // Build per-plate tweens from the current drawn position to the new target.
    const tweens = new Map<string, Tween>();
    for (const bus of buses) {
      const prev = drawn.get(bus.plateNumb);
      const fromLat = prev?.lat ?? bus.lat;
      const fromLng = prev?.lng ?? bus.lng;
      const moved =
        Math.abs(fromLat - bus.lat) > 1e-7 ||
        Math.abs(fromLng - bus.lng) > 1e-7;
      const bearing = moved
        ? bearingDeg(
            { lat: fromLat, lng: fromLng },
            { lat: bus.lat, lng: bus.lng },
          )
        : (prev?.bearing ?? 0);
      tweens.set(bus.plateNumb, {
        fromLat,
        fromLng,
        toLat: bus.lat,
        toLng: bus.lng,
        bearing,
      });
    }

    // Drop plates that disappeared from the feed.
    const live = new Set(buses.map((b) => b.plateNumb));
    for (const plate of drawn.keys()) {
      if (!live.has(plate)) drawn.delete(plate);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);

      const next: AnimatedBus[] = [];
      for (const bus of buses) {
        const tw = tweens.get(bus.plateNumb);
        if (!tw) continue;
        const lat = tw.fromLat + (tw.toLat - tw.fromLat) * eased;
        const lng = tw.fromLng + (tw.toLng - tw.fromLng) * eased;
        drawn.set(bus.plateNumb, { lat, lng, bearing: tw.bearing });
        next.push({ ...bus, lat, lng, bearing: tw.bearing });
      }

      setFrame(next);
      rafRef.current = t < 1 ? requestAnimationFrame(tick) : null;
    };

    cancelRaf();
    rafRef.current = requestAnimationFrame(tick);

    return cancelRaf;
  }, [buses, durationMs]);

  return frame;
}
