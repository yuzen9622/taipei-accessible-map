import { FlagIcon, TriangleAlertIcon } from "lucide-react";
import { useMemo } from "react";

import useMapStore from "@/stores/useMapStore";

import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { DrawerTitle } from "../ui/drawer";

import type { Route } from "@/types/route.t";
type RouteCardProps = {
  route: Route;
};

export default function RouteCard({ route }: RouteCardProps) {
  const { setRouteSelect } = useMapStore();
  const routeLocalValue = useMemo(() => {
    const result = {
      distance: "",
      duration: "",
      desc: "",
    };
    if (!route) return result;
    if (route.localizedValues?.distance) {
      result.distance = route.localizedValues.distance.text;
    }

    if (route.localizedValues?.duration) {
      result.duration = route.localizedValues.duration.text;
    }

    result.desc = route.description || "";
    return result;
  }, [route]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className=" flex  justify-between items-center">
          <DrawerTitle className="text-2xl">
            {routeLocalValue?.distance}
          </DrawerTitle>

          {routeLocalValue.duration && (
            <p className=" text-muted-foreground  font-bold">
              {routeLocalValue?.duration}
            </p>
          )}
        </CardTitle>

        <div className="flex justify-between items-center">
          <Button onClick={() => setRouteSelect(route)} variant={"outline"}>
            規劃路線
          </Button>

          <Button variant={"outline"}>
            開始 <FlagIcon />
          </Button>
        </div>
        {route.warnings && (
          <div className=" flex items-center gap-2  text-yellow-600 font-bold">
            <TriangleAlertIcon size={20} />
            {route.warnings?.join(" ")}
          </div>
        )}
      </CardHeader>
    </Card>
  );
}
