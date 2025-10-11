"use client";

import useTransitDetail from "@/hook/useTransitDetail";
import useMapStore from "@/stores/useMapStore";

export default function TransitWrapper() {
  useTransitDetail();
  const { stepTransitDetails } = useMapStore();
  console.log("stepTransitDetails", stepTransitDetails);
  return <div></div>;
}
