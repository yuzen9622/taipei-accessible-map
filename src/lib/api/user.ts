import { END_POINT } from "@/lib/config";
import { authenticatedRequest } from "@/lib/fetch";
import type { ApiResponse } from "@/types/response";
import type { UserConfig, UserDTO } from "@/types/user";

export async function getUserInfo(): Promise<
  ApiResponse<{ user: UserDTO; config: UserConfig }>
> {
  return authenticatedRequest(`${END_POINT}/api/user/info`, {
    method: "GET",
  }) as Promise<ApiResponse<{ user: UserDTO; config: UserConfig }>>;
}

export const updateConfig = async (
  config: Partial<UserConfig>
): Promise<ApiResponse<{ config: UserConfig }>> => {
  return authenticatedRequest(`${END_POINT}/api/user/config/update`, {
    method: "POST",
    body: config,
  }) as Promise<ApiResponse<{ config: UserConfig }>>;
};
