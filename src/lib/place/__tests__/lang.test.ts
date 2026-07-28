import { describe, expect, it } from "vitest";
import { toApiLang } from "../lang";

describe("toApiLang", () => {
  it("normalizes every accepted zh tag onto zh-TW", () => {
    for (const tag of ["zh", "zh-TW", "zh-tw", "zh-Hant-TW", "zh-CN"]) {
      expect(toApiLang(tag)).toBe("zh-TW");
    }
  });

  it("normalizes every accepted en tag onto en", () => {
    for (const tag of ["en", "en-US", "en-GB"]) {
      expect(toApiLang(tag)).toBe("en");
    }
  });

  it("omits the param for languages the backend rejects", () => {
    // The endpoints 400 on non-zh/en tags rather than falling back, so an
    // unexpected i18n value must not reach the query string at all.
    for (const tag of ["ja", "ko", "fr-FR", "", undefined]) {
      expect(toApiLang(tag)).toBeUndefined();
    }
  });
});
