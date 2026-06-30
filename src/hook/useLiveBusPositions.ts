import { useEffect, useMemo, useRef } from "react";
import { getBusArrival, getLiveBusPositions } from "@/lib/api/transit";
import { haversineMeters } from "@/lib/geo";
import useMapStore from "@/stores/useMapStore";
import type { BusLeg, LiveBus } from "@/types/route";

const POLL_INTERVAL_MS = 15_000;

interface ArrivalTarget {
  /** Plate of the next bus at the boarding stop, if TDX has dispatched one. */
  plate?: string;
  /** Soonest ETA (minutes) at the boarding stop for this leg's direction. */
  eta: number | null;
}

/**
 * The next vehicle at the boarding stop, from the arrival (ETA) feed.
 *
 * The backend now maps TDX's plate into each arrival entry, so the soonest
 * arrival tells us both *when* the next bus comes and *which plate* it is —
 * the single most reliable way to pin "the bus you're about to board".
 */
async function fetchArrival(leg: BusLeg): Promise<ArrivalTarget> {
  try {
    const res = await getBusArrival(
      leg.routeName,
      leg.departureStop,
      leg.direction,
      leg.tdxCity,
    );
    if (!res.ok || !res.data?.arrivals) return { eta: null };

    const next = res.data.arrivals
      .filter(
        (a) =>
          a.direction === leg.direction &&
          typeof a.estimateMinutes === "number",
      )
      .sort(
        (a, b) => (a.estimateMinutes as number) - (b.estimateMinutes as number),
      )[0];
    if (!next) return { eta: null };

    const plate =
      next.plateNumb && next.plateNumb !== "-1" ? next.plateNumb : undefined;
    return { plate, eta: next.estimateMinutes ?? null };
  } catch {
    return { eta: null };
  }
}

/**
 * Decide which live vehicle is "the one the user is about to board".
 *
 *   1. The plate the arrival (ETA) feed reports as next at the boarding stop —
 *      a 100% precise match whenever it's present in the live feed.
 *   2. Otherwise the plate the route planner pinned (`nearestBus`).
 *   3. Otherwise the live vehicle (same direction) physically closest to the
 *      boarding stop — a best-effort approximation when no plate is known yet.
 */
function resolveTargetPlate(
  leg: BusLeg,
  buses: LiveBus[],
  arrivalPlate?: string,
): string | undefined {
  if (arrivalPlate && buses.some((b) => b.plateNumb === arrivalPlate)) {
    return arrivalPlate;
  }

  const planned = leg.nearestBus?.plateNumb;
  if (planned && buses.some((b) => b.plateNumb === planned)) return planned;

  // leg.polyline is [lng, lat][]; index 0 is the boarding (departure) stop.
  const boarding = leg.polyline?.[0];
  if (!boarding) return planned;
  const boardingLatLng = { lng: boarding[0], lat: boarding[1] };

  let best: { plate: string; dist: number } | null = null;
  for (const bus of buses) {
    if (bus.direction !== leg.direction) continue;
    const dist = haversineMeters(boardingLatLng, {
      lat: bus.lat,
      lng: bus.lng,
    });
    if (!best || dist < best.dist) best = { plate: bus.plateNumb, dist };
  }
  return best?.plate ?? planned;
}

/** Fetch every live vehicle on one bus leg and tag the target one. */
async function fetchLeg(leg: BusLeg, signal: AbortSignal): Promise<LiveBus[]> {
  // ETA and positions are independent; run them together.
  const [arrival, posRes] = await Promise.all([
    fetchArrival(leg),
    getLiveBusPositions(leg.routeName, leg.tdxCity, leg.direction, signal),
  ]);

  if (!posRes.ok || !posRes.data?.buses?.length) return [];

  const buses = posRes.data.buses;
  const targetPlate = resolveTargetPlate(leg, buses, arrival.plate);

  return buses.map((bus) => {
    const target = !!targetPlate && bus.plateNumb === targetPlate;
    return {
      ...bus,
      routeName: leg.routeName,
      city: leg.tdxCity ?? "",
      isTarget: target,
      estimateTime: target ? arrival.eta : null,
    };
  });
}

/**
 * Polls live bus positions every 15s while a route with bus legs is selected,
 * pushing the result (with the target vehicle tagged) into the map store.
 *
 * - Fetches through the shared API layer (`END_POINT` config, not a hardcoded
 *   host) so it works in local dev.
 * - Cancels in-flight requests on route change / unmount via AbortController.
 * - Restarts only when the actual bus segments change (stable signature dep),
 *   not on every unrelated `selectRoute` object reallocation.
 * - Pauses while the tab is hidden and refreshes immediately on return.
 * - Keeps the last good positions on a transient error instead of blanking.
 */
export function useLiveBusPositions(): void {
  const selectRoute = useMapStore((s) => s.selectRoute);
  const setLiveBusPositions = useMapStore((s) => s.setLiveBusPositions);

  const busLegs = useMemo<BusLeg[]>(() => {
    const legs = selectRoute?.route?.legs;
    if (!legs) return [];
    return legs.filter((leg): leg is BusLeg => leg.type === "BUS");
  }, [selectRoute?.route?.legs]);

  // A stable string fingerprint of the segments we need to track. Polling only
  // tears down / restarts when this actually changes.
  const signature = useMemo(
    () =>
      busLegs
        .map(
          (l) =>
            `${l.routeName}|${l.tdxCity ?? ""}|${l.direction}|${l.departureStop}`,
        )
        .join("~"),
    [busLegs],
  );

  // Always expose the freshest legs to the polling loop without making the
  // loop restart on every new array reference — only `signature` does that.
  const busLegsRef = useRef(busLegs);
  busLegsRef.current = busLegs;

  // `signature` is the intended restart key: the loop reads the freshest legs
  // from `busLegsRef`, so the effect must NOT also depend on the `busLegs`
  // array reference (that would restart polling on every re-render and reset
  // the 15s timer).
  // biome-ignore lint/correctness/useExhaustiveDependencies: signature is a deliberate restart trigger
  useEffect(() => {
    if (busLegsRef.current.length === 0) {
      setLiveBusPositions([]);
      return;
    }

    let cancelled = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = async () => {
      const legs = busLegsRef.current;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;

      try {
        const settled = await Promise.allSettled(
          legs.map((leg) => fetchLeg(leg, signal)),
        );
        if (cancelled || signal.aborted) return;

        const fulfilled = settled.filter(
          (r): r is PromiseFulfilledResult<LiveBus[]> =>
            r.status === "fulfilled",
        );
        // Every leg failed (network blip): keep the last good positions.
        if (fulfilled.length === 0) return;

        setLiveBusPositions(fulfilled.flatMap((r) => r.value));
      } catch {
        // swallow — transient, next tick retries
      }
    };

    // Exactly one pending timer at any time: scheduleNext() always clears the
    // previous one before arming a new one, so overlapping triggers (e.g. the
    // tab being refocused mid-refresh) can never double the polling rate. The
    // gap is measured *after* each refresh settles, so a slow request never
    // stacks behind the next tick.
    function scheduleNext() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    }

    async function tick() {
      if (typeof document !== "undefined" && document.hidden) {
        scheduleNext();
        return;
      }
      await refresh();
      if (!cancelled) scheduleNext();
    }

    function onVisibility() {
      if (!cancelled && !document.hidden) tick();
    }

    tick();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      controller?.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      setLiveBusPositions([]);
    };
  }, [signature, setLiveBusPositions]);
}
