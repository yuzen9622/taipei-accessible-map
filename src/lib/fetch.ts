import { toast } from "sonner";
import { invalidateSession, refreshAccessToken } from "@/lib/authRefresh";
import useAuthStore from "@/stores/useAuthStore";
import type { ApiResponse } from "@/types/response";

interface RequestOptions<T> {
  method?: string;
  body?: T;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  signal?: AbortSignal;
}

/**
 * Internal-only extension of `RequestOptions`, used solely by this module's
 * own 401-retry recursion. `__retried` is not part of the exported
 * `RequestOptions` type, so ordinary callers cannot set it.
 */
interface InternalRequestOptions<T> extends RequestOptions<T> {
  __retried?: boolean;
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
  options: RequestOptions<T> = {},
): Promise<ApiResponse<unknown>> {
  const {
    method = "GET",
    body,
    headers = {},
    requireAuth = false,
    signal,
    __retried,
    ...rest
  } = options as InternalRequestOptions<T>;
  // Captured at the very start of *this* invocation (original or retry),
  // before any await — this is the "session ref right before the retry
  // fires" that the retry-still-401 path invalidates via compare-and-commit.
  const sessionAtEntry = useAuthStore.getState().session;
  if (requireAuth) {
    const token = await getAccessToken();
    headers.Authorization = `Bearer ${token}`;
  }
  const init: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
  };

  if (body) {
    init.body = JSON.stringify(body);
  }
  const response = await fetch(url, init);
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
    if (__retried) {
      // Already refreshed + retried once for this original request — stop,
      // don't recurse again, safely invalidate (compare-and-commit against
      // the session captured before this retry) and return the 401 as-is.
      invalidateSession(sessionAtEntry);
      return data;
    }
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // The coordinator already committed the new token to the store, so
      // the retried call's own `requireAuth` block above will pick it up
      // via `getAccessToken()` and set a fresh Authorization header.
      return fetchRequest(url, {
        method,
        body,
        headers,
        requireAuth,
        signal,
        ...rest,
        __retried: true,
      } as InternalRequestOptions<T>);
    }
    // null: either a genuine refresh failure (session now `{accessToken:
    // ""}`) or a discard because the identity changed underneath us
    // (logout, or logout-then-relogin) — in the latter case `session` is
    // either null or a different, still-valid session, so stay silent
    // (round7-F1 / "主動登出後不顯示登入已過期 toast").
    const sessionAfter = useAuthStore.getState().session;
    if (sessionAfter && sessionAfter.accessToken === "") {
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
