"use client";

import { Accessibility } from "lucide-react";
import { useMemo } from "react";
import { useAppTranslation } from "@/i18n/client";
import type { AccessibleRoute } from "@/types/route";
import { Badge } from "../ui/badge";

export default function RouteReasonSummary({
  route,
}: {
  route: AccessibleRoute;
}) {
  const { t } = useAppTranslation();

  const facilityCount = useMemo(() => {
    return route.legs.reduce((sum, leg) => {
      if (leg.type === "WALK" && leg.a11yFacilities) {
        return sum + leg.a11yFacilities.length;
      }
      return sum;
    }, 0);
  }, [route.legs]);

  if (facilityCount === 0) return null;

  return (
    <Badge
      variant="outline"
      className="text-xs gap-1"
      aria-label={
        t("routeA11yFacilityCount", { count: facilityCount }) ??
        `沿途 ${facilityCount} 個無障礙設施`
      }
    >
      <Accessibility className="h-3 w-3" aria-hidden />
      {t("routeA11yFacilityCount", { count: facilityCount })}
    </Badge>
  );
}
