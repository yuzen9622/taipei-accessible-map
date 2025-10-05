"use client";

import useMapStore from "@/stores/useMapStore";
export default function useNavigation() {
  const {
    navigation,
    setNavigation,
    setNavigationDrawerOpen,
    setInfoShow,
    setRouteInfoShow,
    map,

    selectRoute,
  } = useMapStore();

  const nextStep = () => {
    const currentRoute = navigation.steps[navigation.currentStepIndex];
    let currentDetailStep: google.maps.DirectionsStep | null = null;

    if (navigation.detailStepIndex < currentRoute.steps.length - 1) {
      currentDetailStep = currentRoute.steps[navigation.detailStepIndex + 1];
      setNavigation({ detailStepIndex: navigation.detailStepIndex + 1 });
    } else if (navigation.currentStepIndex < navigation.totalSteps - 1) {
      currentDetailStep =
        navigation.steps[navigation.currentStepIndex + 1].steps[0];
      setNavigation({
        currentStepIndex: navigation.currentStepIndex + 1,
        detailStepIndex: 0,
      });
    }
    if (map && currentDetailStep) {
      const { start_location, end_location } = currentDetailStep;
      map.panTo(start_location);
      map.setZoom(20);
      const heading = google.maps.geometry.spherical.computeHeading(
        start_location,
        end_location
      );
      map.setTilt(45);
      map.setHeading(heading);
    }
  };

  const prevStep = () => {
    const currentRoute = navigation.steps[navigation.currentStepIndex];
    let currentDetailStep: google.maps.DirectionsStep | null = null;

    if (navigation.detailStepIndex > 0) {
      currentDetailStep = currentRoute.steps[navigation.detailStepIndex - 1];
      setNavigation({ detailStepIndex: navigation.detailStepIndex - 1 });
    } else if (navigation.currentStepIndex - 1 >= 0) {
      currentDetailStep =
        navigation.steps[navigation.currentStepIndex - 1].steps[0];
      setNavigation({
        currentStepIndex:
          navigation.currentStepIndex - 1 < 0
            ? 0
            : navigation.currentStepIndex - 1,
        detailStepIndex:
          navigation.steps[navigation.currentStepIndex - 1]?.steps.length - 1,
      });
    }
    if (currentDetailStep && map) {
      const { start_location, end_location } = currentDetailStep;
      map.panTo(start_location);
      map.setZoom(20);
      const heading = google.maps.geometry.spherical.computeHeading(
        start_location,
        end_location
      );

      map.setHeading(heading);
      map.setTilt(45);
    }
  };

  const startNavigation = (steps: google.maps.DirectionsStep[]) => {
    const navigationSteps = steps.flatMap((step) => {
      if (step.steps) {
        return { title: step.instructions, steps: step.steps };
      }
      return { title: step.instructions, steps: [step] };
    });
    setNavigationDrawerOpen(true);
    setInfoShow({ isOpen: false });
    setRouteInfoShow(false);
    setNavigation({
      isNavigating: true,
      steps: navigationSteps,
      currentStepIndex: 0,
      totalSteps: navigationSteps.length,
    });
  };

  const stopNavigation = () => {
    if (!map || !selectRoute) return;
    map.setTilt(0);
    map.setHeading(0);
    map.setZoom(14);
    map.panToBounds(selectRoute.bounds);

    setNavigationDrawerOpen(false);
    setInfoShow({ isOpen: false });
    setRouteInfoShow(true);
    setNavigation({
      isNavigating: false,
      steps: [],
      currentStepIndex: 0,
      totalSteps: 0,
      detailStepIndex: 0,
    });
  };

  const currentStep = navigation.isNavigating
    ? {
        title: navigation.steps[navigation.currentStepIndex].title,
        step: navigation.steps[navigation.currentStepIndex]?.steps[
          navigation.detailStepIndex
        ],
      }
    : null;

  return {
    nextStep,
    prevStep,
    stopNavigation,
    startNavigation,
    currentStep,
  };
}
