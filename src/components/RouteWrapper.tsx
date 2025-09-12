import { useMemo } from "react";

import useMapStore from "@/stores/useMapStore";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

import Polyline from "./Polyline";

const defaultAppearance = {
  walkingPolylineColor: "rgb(59, 130, 246)",
  defaultPolylineColor: "rgb(249, 115, 22)",
};

export default function RouteLine() {
  const { computeRoute } = useMapStore();
  const geometry = useMapsLibrary("geometry");
  const polylinesElement = useMemo(() => {
    if (!computeRoute) return null;

    return computeRoute.legs[0].steps
      .map((step, index) => {
        if (!step.polyline?.encodedPolyline) return null;

        const isWalking = step.travelMode === "WALK";
        const color = isWalking
          ? defaultAppearance.walkingPolylineColor
          : step.transitDetails?.transitLine?.color ??
            defaultAppearance.defaultPolylineColor;

        // 解碼成座標陣列

        if (!geometry) return null;

        const path = geometry.encoding.decodePath(
          step.polyline.encodedPolyline
        );

        return (
          <div key={`route-${index + 1}`}>
            {/* 白色外框 */}
            <Polyline
              path={path}
              strokeColor="#ffffff"
              strokeOpacity={1}
              strokeWeight={8}
              clickable={false}
            />
            {/* 主色線 */}
            <Polyline
              path={path}
              strokeColor={color}
              strokeOpacity={1}
              strokeWeight={5}
              zIndex={2}
              icons={
                isWalking
                  ? [
                      {
                        icon: {
                          path: "M 0,-1 0,1",
                          strokeOpacity: 1,
                          scale: 4,
                        },
                        offset: "0",
                        repeat: "20px",
                      },
                    ]
                  : undefined
              }
            />
          </div>
        );
      })
      .filter(Boolean);
  }, [computeRoute, geometry]);

  return <div>{polylinesElement}</div>;
}
