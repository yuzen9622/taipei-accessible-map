import { END_POINT } from "@/lib/config";
import type { ApiResponse } from "@/types/response";

/**
 * Raw auth transport leaf module (plan §4 authTransport.ts row).
 *
 * Only depends on `config.ts` — never imports the store, `fetch.ts`, or
 * `api/auth.ts` — so it can sit underneath `authRefresh.ts` without creating
 * a cycle. Both functions use the native `fetch` directly; neither goes
 * through `fetchRequest`, so neither can ever trigger the 401-refresh path
 * in `fetch.ts`.
 */

/**
 * Calls the refresh endpoint and resolves the new access token, or `null` on
 * any failure (network error, non-2xx, or unsuccessful response body).
 */
export async function requestRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${END_POINT}/api/v1/user/refresh`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await response.json()) as ApiResponse<unknown>;
    const isSuccess = data.ok === true || data.success === true;
    if (!isSuccess) {
      return null;
    }
    return data.accessToken || null;
  } catch {
    return null;
  }
}

/**
 * Revokes the session on the backend using an explicitly supplied token.
 * Always uses the token handed to it (captured by the caller before it
 * clears local state) — never reads the store. Failures are only logged;
 * this function never rejects, so callers never need to catch it.
 */
export async function revokeSession(token: string): Promise<void> {
  try {
    await fetch(`${END_POINT}/api/v1/user/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    console.error("[authTransport] revokeSession failed", error);
  }
}
