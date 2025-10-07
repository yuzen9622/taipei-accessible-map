import {
  BusIcon,
  Clock,
  FlagIcon,
  Footprints,
  Train,
  TramFront,
} from "lucide-react";
import { useMemo } from "react";
import useNavigation from "@/hook/useNavigation";
import { cn, getStepColor } from "@/lib/utils";

import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

type RouteCardProps = {
  route: google.maps.DirectionsRoute;
};

export default function RouteCard({ route }: RouteCardProps) {
  const { startNavigation } = useNavigation();

  const routeLocalValue = useMemo(() => {
    const result = {
      distance: "",
      duration: "",
    };
    if (!route) return result;
    if (route.legs[0].distance?.text) {
      result.distance = route.legs[0].distance.text;
    }

    if (route.legs[0].duration?.text) {
      result.duration = route.legs[0].duration.text;
    }

    return result;
  }, [route]);

  // 獲取步驟顏色
  const stepColor = (step: google.maps.DirectionsStep) => {
    if (step.travel_mode === google.maps.TravelMode.WALKING) {
      return "border-blue-500 bg-blue-50 dark:bg-blue-950/20";
    }
    const color = getStepColor(step);

    if (color) {
      return `border-[${color}]`;
    }

    return "border-gray-300 bg-gray-50 dark:bg-gray-950/20";
  };
  const getIcon = (step: google.maps.DirectionsStep) => {
    const color = getStepColor(step);
    switch (step.transit?.line.vehicle.type) {
      case google.maps.VehicleType.BUS:
        return (
          <BusIcon
            className="h-4 w-4 "
            style={{
              color,
            }}
          />
        );
      case google.maps.VehicleType.SUBWAY:
        return <TramFront className="h-4 w-4 " style={{ color: color }} />;
      case google.maps.VehicleType.RAIL:
        return (
          <Train
            className="h-4 w-4 "
            style={{
              color,
            }}
          />
        );
      case google.maps.VehicleType.TRAM:
        return <TramFront className="h-4 w-4 " style={{ color: color }} />;
      case google.maps.VehicleType.HIGH_SPEED_TRAIN:
        return (
          <Train
            className="h-4 w-4 "
            style={{
              color,
            }}
          />
        );
      default:
        return <Footprints className="h-4 w-4 " style={{ color: color }} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{routeLocalValue?.distance}</h1>

          {routeLocalValue.duration && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-bold">{routeLocalValue?.duration}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 路徑步驟 */}
        <div className="relative space-y-2">
          {route?.legs[0]?.steps?.map((step, index) => {
            const isWalking =
              step.travel_mode === google.maps.TravelMode.WALKING;
            const isTransit =
              step.travel_mode === google.maps.TravelMode.TRANSIT;

            return (
              <div
                key={step.encoded_lat_lngs || index}
                className="relative pl-8"
              >
                {/* 連接線 */}
                {index !== route.legs[0].steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-3.5 top-11 bottom-0 w-0.5",
                      isWalking ? "bg-blue-300" : "bg-orange-300",
                    )}
                  />
                )}

                {/* 步驟圖標 */}
                <div className="absolute left-0 top-1">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2",
                      stepColor(step),
                    )}
                  >
                    {getIcon(step)}
                  </div>
                </div>

                {/* 步驟內容 */}
                <div className="pb-4 ml-4">
                  {isWalking && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        步行 {step.distance?.text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        約 {step.duration?.text}
                      </p>
                      {step.instructions && (
                        <p className="text-xs text-muted-foreground">
                          {step.instructions.replaceAll(/<[^>]+>/g, "")}
                        </p>
                      )}
                    </div>
                  )}

                  {isTransit && step.transit && (
                    <div className="space-y-2">
                      {/* 路線資訊 */}
                      <div className="flex items-center gap-2">
                        <div
                          className="px-2 py-1 rounded text-xs font-bold text-white"
                          style={{
                            backgroundColor: getStepColor(step) || "#666",
                          }}
                        >
                          {step.transit.line.short_name ||
                            step.transit.line.name}
                        </div>
                        <span className="text-sm font-medium">
                          {step.transit.line.name}
                        </span>
                      </div>

                      {/* 上下車資訊 */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground shrink-0">
                            上車：
                          </span>
                          <span className="font-medium">
                            {step.transit.departure_stop.name}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground shrink-0">
                            下車：
                          </span>
                          <span className="font-medium">
                            {step.transit.arrival_stop.name}
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          {step.transit.num_stops} 站 • 約 {step.duration?.text}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 開始導航按鈕 */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="default"
            className="w-full"
            onClick={() => startNavigation(route.legs[0].steps)}
          >
            <FlagIcon className="mr-2 h-4 w-4" />
            開始導航
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
