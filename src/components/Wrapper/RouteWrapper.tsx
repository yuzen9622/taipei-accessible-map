import { AdvancedMarker, useMapsLibrary } from "@vis.gl/react-google-maps";
import {
  BusIcon,
  Footprints,
  TrainFrontIcon,
  TrainFrontTunnelIcon,
  TrainIcon,
  TramFront,
} from "lucide-react";

import { Fragment, type JSX, useMemo } from "react";

import { getStepColor } from "@/lib/utils";
import useMapStore from "@/stores/useMapStore";
import Polyline from "../Polyline";
export default function RouteLine() {
  const { selectRoute } = useMapStore();
  const geometry = useMapsLibrary("geometry");

  const polylinesElement = useMemo(() => {
    if (!selectRoute?.route || !geometry) return null;
    const markers: JSX.Element[] = [];
    let lastTravelMode: google.maps.TravelMode | null = null;
    const startEndMarker = (
      <>
        <AdvancedMarker position={selectRoute?.route.legs[0].start_location}>
          <div className=" p-1 rounded-full bg-blue-700  outline-3 outline-offset-2 outline-background"></div>
        </AdvancedMarker>
        <AdvancedMarker
          position={
            selectRoute?.route.legs[selectRoute?.route.legs.length - 1]
              .end_location
          }
        >
          <AdvancedMarker
            position={
              selectRoute?.route.legs[selectRoute?.route.legs.length - 1]
                .end_location
            }
          ></AdvancedMarker>
          <div className=" p-1 rounded-full bg-primary outline-3 outline-offset-2 outline-background"></div>
        </AdvancedMarker>
      </>
    );

    // 再針對 walking step 做點點 overlay
    const stepLines = selectRoute?.route.legs.map((leg) => {
      return leg.steps.map((step) => {
        if (!step.encoded_lat_lngs) return null;

        const isWalking = step.travel_mode === google.maps.TravelMode.WALKING;

        const path = step.path;
        const color = getStepColor(step);
        // 在切換點添加標記（更明顯的版本）
        if (lastTravelMode !== null && lastTravelMode !== step.travel_mode) {
          // 在切換點添加標記
          const startLat = step.start_location.lat();
          const startLng = step.start_location.lng();
          const getIcon = () => {
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
                return (
                  <TramFront className="h-4 w-4 " style={{ color: color }} />
                );
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
                return (
                  <TramFront className="h-4 w-4 " style={{ color: color }} />
                );
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
                return (
                  <Footprints className="h-4 w-4 " style={{ color: color }} />
                );
            }
          };

          markers.push(
            <AdvancedMarker
              key={`marker-${startLat}`}
              position={{ lat: startLat, lng: startLng }}
              zIndex={100}
            >
              <div className="relative">
                {/* 外圈光暈 */}
                <div className="absolute inset-0 w-10 h-10 -translate-x-1/2 -translate-y-1/2  rounded-full opacity-30 " />

                {/* 主要標記 */}
                <div
                  className="flex items-center justify-center w-8 h-8 bg-white rounded-full border-2 shadow-lg relative z-10"
                  style={{
                    borderColor: color,
                  }}
                >
                  {getIcon()}
                </div>
              </div>
            </AdvancedMarker>
          );
        }

        lastTravelMode = step.travel_mode;
        return (
          <Fragment key={step.encoded_lat_lngs}>
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
              key={`walk-step-${step.encoded_lat_lngs}`}
              path={path}
              strokeColor={"#ffffff"}
              strokeOpacity={0}
              strokeWeight={3} // 線不要太粗
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
            />{" "}
          </Fragment>
        );
      });
    });

    return (
      <div>
        {stepLines.map((line) => line)}
        {markers}
        {startEndMarker}
      </div>
    );
  }, [selectRoute?.route, geometry]);

  return <>{polylinesElement}</>;
}
