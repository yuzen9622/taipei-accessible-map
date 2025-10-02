import { FlagIcon } from "lucide-react";
import { useMemo } from "react";

import useMapStore from "@/stores/useMapStore";

import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle } from "../ui/card";
import { DrawerTitle } from "../ui/drawer";

type RouteCardProps = {
  route: google.maps.DirectionsRoute;
};

export default function RouteCard({ route }: RouteCardProps) {
  const { setRouteSelect } = useMapStore();
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
          <Button variant={"outline"}>
            開始 <FlagIcon />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
