"use client";
import moment from "moment";
import { memo } from "react";
import { getStepColor } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import { BUS_STATUS, isBusTransitDetail } from "@/types/transit";
import { Badge } from "../ui/badge";

export const TransitDetail = memo(function TransitDetail({
  i,
  j,
}: {
  i: number;
  j: number;
}) {
  const { computeRoutes, stepTransitDetails } = useMapStore();
  const transitDetail = stepTransitDetails.find(
    (detail) => detail.stepIndex === `${i} ${j}`
  );

  if (!computeRoutes) return null;
  const step = computeRoutes?.[i].legs[0].steps[j];

  if (!step || !step?.transit) return null;
  return (
    <div className="space-y-2">
   
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
      {transitDetail &&
        isBusTransitDetail(transitDetail) &&
        transitDetail.nearbyStop &&
        (transitDetail.nearbyStop.StopStatus < 2 ? (
          <Badge className="text-xs">
            {transitDetail.nearbyStop.EstimateTime
              ? ` 剩餘${Math.floor(
                  transitDetail.nearbyStop.EstimateTime / 60
                )}分鐘`
              : `${moment(transitDetail.nearbyStop.NextBusTime).format(
                  "HH:mm"
                )}上車`}
          </Badge>
        ) : (
          <Badge>
            {transitDetail.nearbyStop &&
              BUS_STATUS[transitDetail.nearbyStop.StopStatus]}
          </Badge>
        ))}

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
