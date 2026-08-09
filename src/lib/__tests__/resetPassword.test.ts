import { afterEach, describe, expect, it, vi } from "vitest";
import { resetPassword } from "@/lib/api/auth";
import { END_POINT } from "@/lib/config";
import { ApiError } from "@/lib/fetch";

// Covers the boundary cases from the reset-password spec that live at the
// API-call layer (response-shape classification), as distinct from the
// page's own local password-format validation (see passwordValidation.test.ts)
// and the a11y/focus behavior that needs a real DOM (see manual checklist in
// the PR description — this repo's vitest setup runs in `environment: "node"`
// with no @testing-library/react, so interactive component tests aren't
// wired up here).

function jsonResponse(body: unknown): Response {
  return { json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resetPassword", () => {
  it("resolves ok:true with user/config/accessToken on 200 (used-once token, sent raw not hashed)", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(`${END_POINT}/api/v1/user/auth/password/reset`);
      const body = JSON.parse(init?.body as string);
      // Token must be forwarded exactly as received — no hashing/encoding.
      expect(body).toEqual({ token: "raw-token-abc", password: "abc12345" });
      return jsonResponse({
        ok: true,
        code: 200,
        message: "ok",
        data: { user: { _id: "u1" }, config: { language: "zh-TW" } },
        accessToken: "new-access-token",
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await resetPassword("raw-token-abc", "abc12345");
    expect(res.ok).toBe(true);
    expect(res.accessToken).toBe("new-access-token");
    expect(res.data?.user).toEqual({ _id: "u1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("resolves ok:false with reason INVALID_TOKEN on 401 (used or expired token) instead of throwing", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        ok: false,
        code: 401,
        message: "invalid token",
        data: { reason: "INVALID_TOKEN" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await resetPassword("used-token", "abc12345");
    expect(res.ok).toBe(false);
    expect((res.data as { reason?: string } | undefined)?.reason).toBe(
      "INVALID_TOKEN",
    );
  });

  it("throws ApiError carrying the field-error list on 400", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        ok: false,
        code: 400,
        message: "validation failed",
        data: {
          errors: [{ path: "password", message: "密碼必須包含數字" }],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(resetPassword("t", "weak")).rejects.toMatchObject({
      code: 400,
    });

    try {
      await resetPassword("t", "weak");
      throw new Error("expected resetPassword to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      const errors = (apiErr.data as { errors?: { message: string }[] })
        ?.errors;
      expect(errors?.[0]?.message).toBe("密碼必須包含數字");
    }
  });

  it("rejects with the raw network error (not ApiError) when the request fails to reach the server", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(resetPassword("t", "abc12345")).rejects.toThrow(
      "Failed to fetch",
    );
    // Must not be misclassified as an ApiError (which the page treats as a
    // 400 field-validation error) or silently resolve — a dropped connection
    // is neither success nor an expired-token response.
    try {
      await resetPassword("t", "abc12345");
      throw new Error("expected resetPassword to throw");
    } catch (err) {
      expect(err).not.toBeInstanceOf(ApiError);
    }
  });
});
