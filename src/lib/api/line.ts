import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import type { RoutePreviewPageData } from "@/types/line";
import type { ApiResponse } from "@/types/response";

export async function getLineRoutePreview(sessionId: string) {
  const encodedSessionId = encodeURIComponent(sessionId);
  const response = await fetchRequest(
    `${END_POINT}/api/v1/line/route-preview?sessionId=${encodedSessionId}`,
    { method: "GET" },
  );
  return response as ApiResponse<RoutePreviewPageData>;
}
