import { END_POINT } from "@/lib/config";
import { authenticatedRequest } from "@/lib/fetch";
import type { ApiResponse } from "@/types/response";
import type { UserDTO } from "@/types/user";

export async function getUserInfo(): Promise<ApiResponse<{ user: UserDTO }>> {
  return authenticatedRequest(`${END_POINT}/api/user/info`, {
    method: "GET",
  }) as Promise<ApiResponse<{ user: UserDTO }>>;
}
