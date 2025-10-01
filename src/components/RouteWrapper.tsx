import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Fragment, useMemo } from "react";
import useMapStore from "@/stores/useMapStore";

import Polyline from "./Polyline";

const defaultAppearance = {
  walkingPolylineColor: "rgb(59, 130, 246)",
  defaultPolylineColor: "rgb(249, 115, 22)",
};

export default function RouteLine() {
  const { selectRoute } = useMapStore();
  const geometry = useMapsLibrary("geometry");

  const polylinesElement = useMemo(() => {
    if (!selectRoute || !geometry) return null;

    // 再針對 walking step 做點點 overlay
    const stepLines = selectRoute.legs[0].steps.map((step) => {
      if (!step.encoded_lat_lngs) return null;

      const isWalking = step.travel_mode === google.maps.TravelMode.WALKING;
      console.log(step);
      const path = geometry.encoding.decodePath(step.encoded_lat_lngs);
      const color = isWalking
        ? defaultAppearance.walkingPolylineColor
        : step.transit?.line?.color ?? defaultAppearance.defaultPolylineColor;

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

    return <div>{stepLines}</div>;
  }, [selectRoute, geometry]);

  return <>{polylinesElement}</>;
}
