import { END_POINT } from "@/lib/config";
import { fetchRequest } from "@/lib/fetch";
import type { ApiResponse } from "@/types/response";
import type { UserConfig, UserDTO } from "@/types/user";

export async function login(
  email: string,
  name: string,
  avatar: string,
  client_id: string
) {
  return fetchRequest(`${END_POINT}/api/v1/user/login`, {
    method: "POST",
    body: { email, name, avatar, client_id },
  }) as Promise<ApiResponse<{ user: UserDTO; config: UserConfig }>>;
}

export async function refreshToken(): Promise<string | null> {
  try {
    const response = await fetchRequest(`${END_POINT}/api/v1/user/refresh`, {
      method: "POST",
    });
    if (!response.ok) {
      return null;
    }
    return (response as unknown as Record<string, unknown>).accessToken as string || null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<ApiResponse<null>> {
  return fetchRequest(`${END_POINT}/api/v1/user/logout`, {
    method: "POST",
    requireAuth: true,
  }) as Promise<ApiResponse<null>>;
}
