"use client";

import { MapPinIcon } from "@animateicons/react/lucide";
import { Accessibility, ArrowUpDown, DoorOpen, MapPin } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import usePin from "@/hook/usePin";
import { useAppTranslation } from "@/i18n/client";
import { haversineMeters } from "@/lib/geo";
import useMapStore from "@/stores/useMapStore";
import useOnboardingStore from "@/stores/useOnboardingStore";
import { A11yEnum } from "@/types";
import {
  defaultFacilityCategories,
  FACILITY_CATEGORY_TO_A11Y_ENUM,
} from "@/types/a11yProfile";
import { formatDistance } from "@/types/route";

const CATEGORY_ICON: Record<
  A11yEnum,
  React.ComponentType<{ className?: string }>
> = {
  [A11yEnum.ELEVATOR]: ArrowUpDown,
  [A11yEnum.RAMP]: Accessibility,
  [A11yEnum.RESTROOM]: DoorOpen,
  [A11yEnum.NONE]: MapPin,
};

const CATEGORY_LABEL_KEY: Record<A11yEnum, string> = {
  [A11yEnum.ELEVATOR]: "elevator",
  [A11yEnum.RAMP]: "ramp",
  [A11yEnum.RESTROOM]: "toilet",
  [A11yEnum.NONE]: "",
};

/**
 * §S5 item 3: replaces "pick from six categories" with "here's what your own
 * profile says you need, already sorted by distance" — the six-color quick
 * action row moved down to a secondary, neutral-chrome row below this.
 * Reuses `a11yPlaces` already fetched by `A11yFacilitiesWrapper` on mount, so
 * this costs no extra request.
 */
export default function NearbyContextBlock() {
  const { t } = useAppTranslation();
  const {
    userLocation,
    a11yPlaces,
    setSelectA11yPlace,
    setA11yDrawerOpen,
    setSheetMode,
  } = useMapStore(
    useShallow((s) => ({
      userLocation: s.userLocation,
      a11yPlaces: s.a11yPlaces,
      setSelectA11yPlace: s.setSelectA11yPlace,
      setA11yDrawerOpen: s.setA11yDrawerOpen,
      setSheetMode: s.setSheetMode,
    })),
  );
  const { handlePinClick } = usePin();
  const situations = useOnboardingStore((s) => s.profile.situations);

  const relevantTypes = useMemo(() => {
    const categories = defaultFacilityCategories(situations);
    return new Set(categories.map((c) => FACILITY_CATEGORY_TO_A11Y_ENUM[c]));
  }, [situations]);

  const nearest = useMemo(() => {
    if (!userLocation || !a11yPlaces?.length) return [];
    return a11yPlaces
      .filter((p) => relevantTypes.has(p.a11yType))
      .map((p) => ({
        place: p,
        distance: haversineMeters(userLocation, p.position),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }, [userLocation, a11yPlaces, relevantTypes]);

  if (!userLocation || nearest.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <MapPinIcon size={16} />
        {t("nearbyContextTitle", "你附近")}
      </h2>
      <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4">
        {nearest.map(({ place, distance }) => {
          const Icon = CATEGORY_ICON[place.a11yType];
          const labelKey = CATEGORY_LABEL_KEY[place.a11yType];
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => {
                // Same tap contract as A11yFacilityPin on the map: fly to
                // it, then open the facility detail sheet rather than just
                // panning the map with nothing to show for it.
                handlePinClick(place.position);
                setSelectA11yPlace(place);
                setA11yDrawerOpen(true);
                setSheetMode("station");
              }}
              className="flex w-[132px] shrink-0 snap-start flex-col items-start gap-1 rounded-2xl border border-border/60 bg-card/50 p-3 text-left transition-colors hover:bg-accent/30"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium text-foreground">
                {labelKey ? t(labelKey) : ""}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {formatDistance(distance)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
