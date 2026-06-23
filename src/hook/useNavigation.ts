"use client";

export default function useNavigation() {
  return {
    nextStep: () => {},
    prevStep: () => {},
    stopNavigation: () => {},
    startNavigation: () => {},
    currentStep: null,
  };
}
