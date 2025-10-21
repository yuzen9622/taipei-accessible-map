import {
  BusIcon,
  Clock,
  FlagIcon,
  Footprints,
  Loader2,
  TrainFrontIcon,
  TrainFrontTunnelIcon,
  TrainIcon,
  TramFront,
} from "lucide-react";
import moment from "moment";
import { memo, useMemo } from "react";
import useNavigation from "@/hook/useNavigation";
import { cn, getStepColor } from "@/lib/utils";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import "moment/locale/zh-tw";
import { useRouteRank } from "@/hook/useRouteRank";
import { useAppTranslation } from "@/i18n/client";
import useMapStore from "@/stores/useMapStore";
import { Badge } from "../ui/badge";
import { TransitDetail } from "./TransitDetail";

moment.locale("zh-tw");
type RouteCardProps = {
  route: google.maps.DirectionsRoute;
  idx: number;
};

export const RouteCard = memo(function RouteCard({
  route,
  idx,
}: RouteCardProps) {
  const { startNavigation } = useNavigation();
  const { setRouteSelect, selectRoute } = useMapStore();
  const { getRouteRank, isLoading } = useRouteRank();
  const { t } = useAppTranslation();
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
          <TrainFrontIcon
            className="h-4 w-4 "
            style={{
              color,
            }}
          />
        );
      case "LONG_DISTANCE_TRAIN" as google.maps.VehicleType:
        return (
          <TrainIcon
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
          <TrainFrontTunnelIcon
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
        {selectRoute?.index === idx &&
          (isLoading ? (
            <Badge variant="secondary" className="gap-2">
              評分路線中 <Loader2 className=" animate-spin" />
            </Badge>
          ) : (
            selectRoute.routeRank && (
              <>
                <Badge>
                  {t("accessibleRank")}
                  {selectRoute.routeRank?.route_total_score}
                </Badge>
                <p className=" flex flex-col gap-2 text-wrap overflow-hidden  text-sm bg-secondary rounded-3xl px-3 py-2 text-muted-foreground">
                  {selectRoute.routeRank?.route_description}
                  <Badge
                    variant={"outline"}
                    className="text-xs self-end  text-destructive whitespace-pre-wrap "
                  >
                    {t("AIwarning")}
                  </Badge>
                </p>
              </>
            )
          ))}
        {selectRoute?.index === idx && <Badge>{t("selectRoute")}</Badge>}
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
                {index !== route.legs[0].steps.length - 1 && (
                  <div
                    className={cn(
                      "absolute left-3.5 top-11 bottom-0 w-0.5",
                      isWalking ? "bg-blue-300" : "bg-orange-300"
                    )}
                  />
                )}

                <div className="absolute left-0 top-1">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2",
                      stepColor(step)
                    )}
                  >
                    {getIcon(step)}
                  </div>
                </div>

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
                    <TransitDetail i={idx} j={index} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            aria-label="Select route"
            onClick={() => {
              getRouteRank(route);
              setRouteSelect({ index: idx, route: route });
            }}
            variant={"outline"}
          >
            {selectRoute?.index === idx ? t("selectedRoute") : t("selectRoute")}
          </Button>
          <Button
            aria-label="Start navigation"
            variant="default"
            onClick={() => startNavigation(route.legs[0].steps)}
          >
            <FlagIcon className="mr-2 h-4 w-4" />
            {t("startNavigation")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
RouteCard.displayName = "RouteCard";
