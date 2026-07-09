import {
  Bike,
  BusIcon,
  Car,
  Footprints,
  TrainFrontIcon,
  TrainFrontTunnelIcon,
  TramFront,
} from "lucide-react";
import { type JSX, useMemo } from "react";
import { Marker } from "react-map-gl/maplibre";

import useMapStore from "@/stores/useMapStore";
import type { RouteLeg } from "@/types/route";
import { getLegColor } from "@/types/route";
import Polyline from "../Polyline";

function polylineToPath(
  polyline: [number, number][],
): { lat: number; lng: number }[] {
  return polyline.map(([lng, lat]) => ({ lat, lng }));
}

function getLegIcon(leg: RouteLeg) {
  const color = getLegColor(leg);
  switch (leg.type) {
    case "WALK":
      return <Footprints className="h-4 w-4" style={{ color }} />;
    case "BUS":
      return <BusIcon className="h-4 w-4" style={{ color }} />;
    case "METRO":
      return <TramFront className="h-4 w-4" style={{ color }} />;
    case "THSR":
      return <TrainFrontTunnelIcon className="h-4 w-4" style={{ color }} />;
    case "TRA":
      return <TrainFrontIcon className="h-4 w-4" style={{ color }} />;
    case "DRIVE":
      return <Car className="h-4 w-4" style={{ color }} />;
    case "MOTORCYCLE":
      return <Bike className="h-4 w-4" style={{ color }} />;
  }
}

export default function RouteLine() {
  const { selectRoute } = useMapStore();

  const polylinesElement = useMemo(() => {
    if (!selectRoute?.route) return null;

    const route = selectRoute.route;
    const markers: JSX.Element[] = [];
    let lastLegType: string | null = null;

    const allLegs = route.legs;
    if (!allLegs.length) return null;

    const firstLeg = allLegs[0];
    const lastLeg = allLegs[allLegs.length - 1];
    const firstPath = firstLeg.polyline?.length
      ? polylineToPath(firstLeg.polyline)
      : null;
    const lastPath = lastLeg.polyline?.length
      ? polylineToPath(lastLeg.polyline)
      : null;

    const startEndMarker = (
      <>
        {firstPath?.[0] && (
          <Marker
            longitude={firstPath[0].lng}
            latitude={firstPath[0].lat}
            anchor="center"
          >
            <div className="p-1 rounded-full bg-blue-700 outline-3 outline-offset-2 outline-background" />
          </Marker>
        )}
        {lastPath?.[lastPath.length - 1] && (
          <Marker
            longitude={lastPath[lastPath.length - 1].lng}
            latitude={lastPath[lastPath.length - 1].lat}
            anchor="center"
          >
            <div className="p-1 rounded-full bg-primary outline-3 outline-offset-2 outline-background" />
          </Marker>
        )}
      </>
    );

    const stepLines = allLegs.map((leg, index) => {
      if (!leg.polyline?.length) return null;

      const path = polylineToPath(leg.polyline);
      const legKey = [
        leg.type,
        path[0]?.lng,
        path[0]?.lat,
        path[path.length - 1]?.lng,
        path[path.length - 1]?.lat,
        path.length,
      ].join("-");
      const color = getLegColor(leg);
      const isWalking = leg.type === "WALK";

      if (lastLegType !== null && lastLegType !== leg.type && path[0]) {
        markers.push(
          <Marker
            key={`marker-${legKey}`}
            longitude={path[0].lng}
            latitude={path[0].lat}
            anchor="center"
          >
            <div className="relative">
              <div
                className="flex items-center justify-center w-8 h-8 bg-white rounded-full border-2 shadow-lg relative z-10"
                style={{ borderColor: color }}
              >
                {getLegIcon(leg)}
              </div>
            </div>
          </Marker>,
        );
      }

      lastLegType = leg.type;

      if (isWalking) {
        return (
          <Polyline
            key={`leg-${legKey}`}
            id={`route-leg-${index}`}
            path={path}
            strokeColor={color}
            strokeOpacity={0.7}
            strokeWeight={4}
            dashArray={[2, 2]}
          />
        );
      }

      return (
        <Polyline
          key={`leg-${legKey}`}
          id={`route-leg-${index}`}
          path={path}
          strokeColor={color}
          strokeOpacity={1}
          strokeWeight={8}
        />
      );
    });

    return (
      <div>
        {stepLines}
        {markers}
        {startEndMarker}
      </div>
    );
  }, [selectRoute?.route]);

  return <>{polylinesElement}</>;
}
