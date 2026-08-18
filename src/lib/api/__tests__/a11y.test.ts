import { afterEach, describe, expect, it, vi } from "vitest";
import { createHazardReport } from "@/lib/api/a11y";
import { END_POINT } from "@/lib/config";
import { ApiError } from "@/lib/fetch";
import useAuthStore from "@/stores/useAuthStore";

function jsonResponse(
  body: unknown,
  status = 200,
  statusText = "OK",
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function htmlResponse(
  _html: string,
  status = 502,
  statusText = "Bad Gateway",
): Response {
  return {
    ok: false,
    status,
    statusText,
    json: async () => {
      throw new SyntaxError("Unexpected token < in JSON at position 0");
    },
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  useAuthStore.setState({ session: null, user: null });
});

describe("createHazardReport", () => {
  it("resolves ok:true with hazard report data on 200/201 success", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody: FormData | undefined;

    const fetchMock = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        capturedUrl = String(url);
        capturedMethod = init?.method ?? "GET";
        capturedBody = init?.body as FormData;

        return jsonResponse({
          ok: true,
          code: 201,
          message: "Report created",
          data: {
            _id: "report-123",
            hazardType: "obstacle",
            latitude: 25.03396,
            longitude: 121.56447,
          },
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.append("hazardType", "obstacle");
    formData.append("latitude", "25.03396");
    formData.append("longitude", "121.56447");

    const res = await createHazardReport(formData);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(capturedUrl).toBe(`${END_POINT}/api/v1/a11y/reports`);
    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toBe(formData);
    expect(res.ok).toBe(true);
    expect(res.data?._id).toBe("report-123");
  });

  it("throws ApiError when backend returns a 400 JSON error envelope", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          ok: false,
          code: 400,
          message: "Invalid hazard report payload",
        },
        400,
        "Bad Request",
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.append("hazardType", "invalid");

    await expect(createHazardReport(formData)).rejects.toThrow(ApiError);
    await expect(createHazardReport(formData)).rejects.toMatchObject({
      code: 400,
      message: "Invalid hazard report payload",
    });
  });

  it("gracefully catches non-JSON error pages (502/504 HTML) and throws ApiError", async () => {
    const fetchMock = vi.fn(async () =>
      htmlResponse(
        "<html><body>502 Bad Gateway</body></html>",
        502,
        "Bad Gateway",
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    formData.append("hazardType", "obstacle");

    await expect(createHazardReport(formData)).rejects.toThrow(ApiError);
    await expect(createHazardReport(formData)).rejects.toMatchObject({
      code: 502,
      message: "Bad Gateway",
    });
  });

  it("attaches Authorization header when user is authenticated", async () => {
    useAuthStore.setState({
      session: {
        accessToken: "test-jwt-token",
      },
    });

    let capturedHeaders: Record<string, string> = {};
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
        return jsonResponse({
          ok: true,
          code: 200,
          data: { _id: "report-123" },
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const formData = new FormData();
    await createHazardReport(formData);

    expect(capturedHeaders.Authorization).toBe("Bearer test-jwt-token");
  });
});
