import useAuthStore from "@/stores/useAuthStore";
import type { ApiResponse } from "@/types/response";

interface RequestOptions<T> {
  method?: string;
  body?: T;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  signal?: AbortSignal;
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
    signal,
    ...rest
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
    ...rest,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const data = (await response.json()) as ApiResponse<unknown>;
  if (!data.ok && data.code !== 401) {
    throw new Error(data.message || "Fetch error");
  }
  return data;
}
export async function authenticatedRequest<T>(
  url: string,
  options: Omit<RequestOptions<T>, "requireAuth"> = {}
) {
  return fetchRequest(url, { ...options, requireAuth: true });
}
