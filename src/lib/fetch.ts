import useAuthStore from "@/stores/useAuthStore";
import type { ApiResponse } from "@/types/response";

interface RequestOptions<T> {
  method?: string;
  body?: T;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

export async function getAccessToken() {
  return useAuthStore.getState().session?.accessToken;
}

export async function fetchRequest<T>(
  url: string,
  {
    method = "GET",
    body,
    headers = {},
    requireAuth = false,
  }: RequestOptions<T> = {}
): Promise<ApiResponse<unknown>> {
  if (requireAuth) {
    const token = await getAccessToken();
    headers["Authorization"] = `Bearer ${token}`;
  }
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    console.log(
      `HTTP error! status: ${response.status}: ${response.statusText}`
    );
    if (response.status === 500)
      throw new Error(
        `HTTP error! status: ${response.status}: ${response.statusText}`
      );
  }
  return response.json();
}
export async function authenticatedRequest<T>(
  url: string,
  options: Omit<RequestOptions<T>, "requireAuth"> = {}
) {
  return fetchRequest(url, { ...options, requireAuth: true });
}
