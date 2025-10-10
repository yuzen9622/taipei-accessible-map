"use client";
import { memo } from "react";
import { getStepColor } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";

export const TransitDetail = memo(function TransitDetail({
  i,
  j,
}: {
  i: number;
  j: number;
}) {
  const { computeRoutes } = useMapStore();

  const step = computeRoutes?.[i].legs[0].steps[j];

  if (!step || !step?.transit) return null;
  return (
    <div className="space-y-2">
      {/* 路線資訊 */}
      <div className="flex items-center gap-2">
        <div
          className="px-2 py-1 rounded text-xs font-bold text-white"
          style={{
            backgroundColor: getStepColor(step) || "#666",
          }}
        >
          {step.transit?.line?.short_name || step.transit?.line.name}
        </div>
        <span className="text-sm font-medium">{step.transit?.line.name}</span>
      </div>
      {/* {busDetail.nearbyStop &&
        (busDetail.nearbyStop.StopStatus < 2 ? (
          <Badge className="text-xs">
            {busDetail.nearbyStop.EstimateTime
              ? ` 剩餘${Math.floor(busDetail.nearbyStop.EstimateTime / 60)}分鐘`
              : `${moment(busDetail.nearbyStop.NextBusTime).format(
                  "HH:mm"
                )}上車`}
          </Badge>
        ) : (
          <Badge>
            {busDetail.nearbyStop &&
              BUS_STATUS[busDetail.nearbyStop.StopStatus]}
          </Badge>
        ))} */}
      {/* 上下車資訊 */}
      <div className="space-y-1 text-xs">
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground shrink-0">上車：</span>

          <span className="font-medium">
            {step.transit.departure_stop.name}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground shrink-0">下車：</span>
          <span className="font-medium">{step.transit.arrival_stop.name}</span>
        </div>
        <div className="text-muted-foreground">
          {step.transit.num_stops} 站 • 約 {step.duration?.text}
        </div>
      </div>
    </div>
  );
});

TransitDetail.displayName = "TransitDetail";
