"use client";

import useMapStore from "@/stores/useMapStore";

export default function TransitWrapper() {
  const { selectRoute } = useMapStore();

  return <div></div>;
}
