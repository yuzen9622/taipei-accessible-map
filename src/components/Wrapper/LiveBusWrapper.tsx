"use client";

import { Accessibility, Bus } from "lucide-react";
import { Marker } from "react-map-gl/maplibre";
import { type AnimatedBus, useAnimatedBuses } from "@/hook/useAnimatedBuses";
import { useLiveBusPositions } from "@/hook/useLiveBusPositions";
import useMapStore from "@/stores/useMapStore";

function isAccessible(bus: AnimatedBus): boolean {
  return bus.isLowFloor === "是" || bus.hasLiftOrRamp === "是";
}

function etaLabel(bus: AnimatedBus): string {
  const eta = bus.estimateTime;
  if (typeof eta !== "number") return "你的車";
  if (eta <= 1) return "即將進站";
  return `約 ${eta} 分`;
}

/** The vehicle the user is about to board — large, pulsing, labelled. */
function TargetBusMarker({ bus }: { bus: AnimatedBus }) {
  const accessible = isAccessible(bus);
  const accentBg = accessible ? "bg-blue-600" : "bg-slate-700";
  const accentBorder = accessible ? "border-b-blue-600" : "border-b-slate-700";
  const ringBg = accessible ? "bg-blue-500/40" : "bg-slate-500/40";

  return (
    <Marker
      longitude={bus.lng}
      latitude={bus.lat}
      anchor="center"
      style={{ zIndex: 10 }}
    >
      <div className="relative flex h-9 w-9 items-center justify-center">
        {/* attention-grabbing pulse */}
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ringBg}`}
        />
        {/* heading indicator (triangle orbits the circle toward travel dir) */}
        <div
          className="absolute inset-0 z-10"
          style={{ transform: `rotate(${bus.bearing}deg)` }}
        >
          <span
            className={`absolute -top-1.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-x-transparent border-b-[7px] ${accentBorder}`}
          />
        </div>
        {/* vehicle badge */}
        <div
          className={`relative z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-white shadow-lg ${accentBg}`}
        >
          {accessible ? (
            <Accessibility className="h-5 w-5" />
          ) : (
            <Bus className="h-5 w-5" />
          )}
        </div>
        {/* callout */}
        <div className="absolute left-1/2 top-[calc(100%+5px)] z-20 flex -translate-x-1/2 flex-col items-center gap-0.5">
          <div
            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow ${accentBg}`}
          >
            {etaLabel(bus)}
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap rounded-full border bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
            {accessible && <Accessibility className="h-3 w-3 text-blue-600" />}
            {bus.plateNumb}
          </div>
        </div>
      </div>
    </Marker>
  );
}

/** Every other vehicle on the route — small, muted, non-interactive. */
function FleetBusMarker({ bus }: { bus: AnimatedBus }) {
  const accessible = isAccessible(bus);
  return (
    <Marker
      longitude={bus.lng}
      latitude={bus.lat}
      anchor="center"
      style={{ zIndex: 1 }}
    >
      <div
        title={`${bus.plateNumb}${accessible ? "（無障礙）" : ""} · ${bus.statusLabel ?? ""}`}
        className={`flex h-6 w-6 items-center justify-center rounded-full border border-white/80 text-white opacity-80 shadow-md ${
          accessible ? "bg-blue-500" : "bg-slate-400"
        }`}
      >
        {accessible ? (
          <Accessibility className="h-3.5 w-3.5" />
        ) : (
          <Bus className="h-3.5 w-3.5" />
        )}
      </div>
    </Marker>
  );
}

export default function LiveBusWrapper() {
  // Starts/owns the 15s polling lifecycle while a bus route is selected.
  useLiveBusPositions();
  const liveBusPositions = useMapStore((s) => s.liveBusPositions);
  const buses = useAnimatedBuses(liveBusPositions);

  if (buses.length === 0) return null;

  return (
    <>
      {buses.map((bus) =>
        bus.isTarget ? (
          <TargetBusMarker key={bus.plateNumb} bus={bus} />
        ) : (
          <FleetBusMarker key={bus.plateNumb} bus={bus} />
        ),
      )}
    </>
  );
}
