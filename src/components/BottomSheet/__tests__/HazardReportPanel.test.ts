import { describe, expect, it } from "vitest";
import {
  ALLOWED_REPORT_PHOTO_TYPES,
  MAX_REPORT_PHOTO_SIZE_BYTES,
  validateHazardPhoto,
} from "@/components/BottomSheet/HazardReportPanel";

describe("HazardReportPanel photo validation (P2-5)", () => {
  it("defines 5MB size limit and allowed MIME types", () => {
    expect(MAX_REPORT_PHOTO_SIZE_BYTES).toBe(5 * 1024 * 1024);
    expect(ALLOWED_REPORT_PHOTO_TYPES).toContain("image/jpeg");
    expect(ALLOWED_REPORT_PHOTO_TYPES).toContain("image/png");
    expect(ALLOWED_REPORT_PHOTO_TYPES).toContain("image/webp");
  });

  it("accepts valid JPEG, PNG, and WebP images within 5MB", () => {
    const jpeg = { size: 1024 * 1024, type: "image/jpeg" }; // 1MB
    const png = { size: 3 * 1024 * 1024, type: "image/png" }; // 3MB
    const webp = { size: 500 * 1024, type: "image/webp" }; // 500KB

    expect(validateHazardPhoto(jpeg)).toEqual({ valid: true });
    expect(validateHazardPhoto(png)).toEqual({ valid: true });
    expect(validateHazardPhoto(webp)).toEqual({ valid: true });
  });

  it("rejects files exceeding 5MB with IMAGE_TOO_LARGE", () => {
    const tooLarge = {
      size: 5 * 1024 * 1024 + 1, // 5MB + 1 byte
      type: "image/jpeg",
    };

    expect(validateHazardPhoto(tooLarge)).toEqual({
      valid: false,
      error: "IMAGE_TOO_LARGE",
    });
  });

  it("rejects non-image files with INVALID_IMAGE_TYPE", () => {
    const pdf = { size: 1024 * 1024, type: "application/pdf" };
    const text = { size: 500, type: "text/plain" };
    const exe = { size: 2048, type: "application/x-msdownload" };
    const video = { size: 2 * 1024 * 1024, type: "video/mp4" };

    expect(validateHazardPhoto(pdf)).toEqual({
      valid: false,
      error: "INVALID_IMAGE_TYPE",
    });
    expect(validateHazardPhoto(text)).toEqual({
      valid: false,
      error: "INVALID_IMAGE_TYPE",
    });
    expect(validateHazardPhoto(exe)).toEqual({
      valid: false,
      error: "INVALID_IMAGE_TYPE",
    });
    expect(validateHazardPhoto(video)).toEqual({
      valid: false,
      error: "INVALID_IMAGE_TYPE",
    });
  });

  it("accepts other image MIME subtypes", () => {
    const bmp = { size: 500 * 1024, type: "image/bmp" };
    expect(validateHazardPhoto(bmp)).toEqual({ valid: true });
  });
});
