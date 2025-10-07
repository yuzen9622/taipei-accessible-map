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

  const speakDistance = (step: google.maps.DirectionsStep) => {
    if (step.travel_mode !== google.maps.TravelMode.WALKING) return;
    const msg = new SpeechSynthesisUtterance(`前方距離 ${step.distance?.text}`);
    msg.rate = 0.6;
    window.speechSynthesis.speak(msg);
  };

  const speakInstruction = (step: google.maps.DirectionsStep) => {
    const msg = new SpeechSynthesisUtterance(
      step.instructions?.replaceAll(/<[^>]*>|\/+/g, "")
    );
    msg.rate = 0.6;
    window.speechSynthesis.speak(msg);
  };

  const nextStep = () => {
    const currentRoute = navigation.steps[navigation.currentStepIndex];
    let currentDetailStep: google.maps.DirectionsStep | null = null;

    if (navigation.detailStepIndex < currentRoute.steps.length - 1) {
      currentDetailStep = currentRoute.steps[navigation.detailStepIndex + 1];
      setNavigation({ detailStepIndex: navigation.detailStepIndex + 1 });
      speakInstruction(currentDetailStep);
    } else if (navigation.currentStepIndex < navigation.totalSteps - 1) {
      currentDetailStep =
        navigation.steps[navigation.currentStepIndex + 1].steps[0];
      speakInstruction(currentDetailStep);
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
      speakDistance(currentDetailStep);
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
    speakInstruction(navigationSteps[0].steps[0]);
    speakDistance(navigationSteps[0].steps[0]);

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
