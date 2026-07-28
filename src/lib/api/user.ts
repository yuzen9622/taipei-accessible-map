import { END_POINT } from "@/lib/config";
import { authenticatedRequest } from "@/lib/fetch";
import type { ApiResponse } from "@/types/response";
import type { LineLinkCodeResult, UserConfig, UserDTO } from "@/types/user";

export async function getUserInfo(): Promise<
  ApiResponse<{ user: UserDTO; config: UserConfig }>
> {
  return authenticatedRequest(`${END_POINT}/api/v1/user/info`, {
    method: "GET",
  }) as Promise<ApiResponse<{ user: UserDTO; config: UserConfig }>>;
}

// Response's `data` is the Config object directly (not nested under `config`).
export const updateConfig = async (
  config: Partial<UserConfig>,
): Promise<ApiResponse<UserConfig>> => {
  return authenticatedRequest(`${END_POINT}/api/v1/user/config/update`, {
    method: "POST",
    body: config,
  }) as Promise<ApiResponse<UserConfig>>;
};

export async function getLineLinkCode(): Promise<
  ApiResponse<LineLinkCodeResult>
> {
  return authenticatedRequest(`${END_POINT}/api/v1/user/line-link-code`, {
    method: "POST",
  }) as Promise<ApiResponse<LineLinkCodeResult>>;
}
