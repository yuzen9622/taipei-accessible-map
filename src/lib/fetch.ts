import { toast } from "sonner";
import useAuthStore from "@/stores/useAuthStore";
import type { ApiResponse } from "@/types/response";
import { refreshToken } from "./api/auth";

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

export class ApiError extends Error {
  code: number;
  reason?: string;

  constructor(message: string, code: number, reason?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.reason = reason;
  }
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
  }: RequestOptions<T> = {},
): Promise<ApiResponse<unknown>> {
  if (requireAuth) {
    const token = await getAccessToken();
    headers.Authorization = `Bearer ${token}`;
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
  const isSuccess = data.ok === true || data.success === true;
  if (!isSuccess && data.code !== 401) {
    throw new ApiError(
      data.message || "Fetch error",
      data.code,
      (data.data as { reason?: string } | undefined)?.reason,
    );
  }
  if (data.code === 401 && requireAuth) {
    const newAccessToken = await refreshToken();
    if (newAccessToken) {
      useAuthStore.getState().setSession({ accessToken: newAccessToken });
      return fetchRequest(url, { method, body, headers, requireAuth, signal });
    } else {
      useAuthStore.getState().setSession({ accessToken: "" });
      useAuthStore.getState().setUser(null);
      toast.error("登入已過期，請重新登入");
    }
  }
  return data;
}
export async function authenticatedRequest<T>(
  url: string,
  options: Omit<RequestOptions<T>, "requireAuth"> = {},
) {
  return fetchRequest(url, { ...options, requireAuth: true });
}
