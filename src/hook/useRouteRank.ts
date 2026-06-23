import { useState } from "react";

export function useRouteRank() {
  const [isLoading] = useState(false);
  return { isLoading, getRouteRank: async () => null };
}
