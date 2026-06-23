import { AdvancedMarker } from "@vis.gl/react-google-maps";
import {
  BusIcon,
  Footprints,
  TrainFrontIcon,
  TrainFrontTunnelIcon,
  TramFront,
} from "lucide-react";

import { Fragment, type JSX, useMemo } from "react";

import useMapStore from "@/stores/useMapStore";
import type { RouteLeg } from "@/types/route";
import { getLegColor } from "@/types/route";
import Polyline from "../Polyline";

function polylineToPath(polyline: [number, number][]): google.maps.LatLngLiteral[] {
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
          <AdvancedMarker position={firstPath[0]}>
            <div className="p-1 rounded-full bg-blue-700 outline-3 outline-offset-2 outline-background" />
          </AdvancedMarker>
        )}
        {lastPath?.[lastPath.length - 1] && (
          <AdvancedMarker position={lastPath[lastPath.length - 1]}>
            <div className="p-1 rounded-full bg-primary outline-3 outline-offset-2 outline-background" />
          </AdvancedMarker>
        )}
      </>
    );

    const stepLines = allLegs.map((leg, index) => {
      if (!leg.polyline?.length) return null;

      const path = polylineToPath(leg.polyline);
      const color = getLegColor(leg);
      const isWalking = leg.type === "WALK";

      if (lastLegType !== null && lastLegType !== leg.type && path[0]) {
        markers.push(
          <AdvancedMarker
            key={`marker-${index}`}
            position={path[0]}
            zIndex={100}
          >
            <div className="relative">
              <div
                className="flex items-center justify-center w-8 h-8 bg-white rounded-full border-2 shadow-lg relative z-10"
                style={{ borderColor: color }}
              >
                {getLegIcon(leg)}
              </div>
            </div>
          </AdvancedMarker>
        );
      }

      lastLegType = leg.type;

      return (
        <Fragment key={`leg-${index}`}>
          {!isWalking && (
            <Polyline
              path={path}
              strokeColor={color}
              strokeOpacity={1}
              strokeWeight={8}
              zIndex={1}
            />
          )}
          <Polyline
            path={path}
            strokeColor={"#ffffff"}
            strokeOpacity={0}
            strokeWeight={3}
            zIndex={2}
            icons={
              isWalking
                ? [
                    {
                      icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: color,
                        fillOpacity: 0.7,
                        strokeColor: "#ffffff",
                        strokeWeight: 1,
                        scale: 5,
                      },
                      offset: "0",
                      repeat: "15px",
                    },
                  ]
                : undefined
            }
          />
        </Fragment>
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
