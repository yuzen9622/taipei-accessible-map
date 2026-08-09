import { describe, expect, it } from "vitest";
import { validatePassword } from "@/lib/passwordValidation";

describe("validatePassword", () => {
  it("accepts a password meeting every rule", () => {
    expect(validatePassword("abc12345")).toBeNull();
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(validatePassword("ab12")).toBe("密碼至少需要 8 個字元");
  });

  it("rejects passwords over 72 bytes (measured in UTF-8 bytes, not characters)", () => {
    // Each 中 is 3 bytes in UTF-8, so 25 of them is 75 bytes — over the
    // bcrypt-derived 72-byte cap — even though it's only 25 *characters*.
    const password = "中".repeat(25);
    expect(new TextEncoder().encode(password).length).toBe(75);
    expect(validatePassword(password)).toBe(
      "密碼過長（最多 72 個位元組，純中文約 24 字）",
    );
  });

  it("accepts exactly 72 bytes — the byte-length check itself must be <=, not <", () => {
    // 23 中 = 69 bytes, plus 3 ASCII chars (1 byte each) = 72 total.
    const password = `${"中".repeat(23)}a1x`;
    expect(new TextEncoder().encode(password).length).toBe(72);
    expect(validatePassword(password)).toBeNull();
  });

  it("rejects 73 bytes — one over the boundary", () => {
    const password = `${"中".repeat(23)}a1xy`;
    expect(new TextEncoder().encode(password).length).toBe(73);
    expect(validatePassword(password)).toBe(
      "密碼過長（最多 72 個位元組，純中文約 24 字）",
    );
  });

  it("rejects a password with letters but no digit", () => {
    expect(validatePassword("abcdefgh")).toBe("密碼必須同時包含英文字母與數字");
  });

  it("rejects a password with digits but no letter", () => {
    expect(validatePassword("12345678")).toBe("密碼必須同時包含英文字母與數字");
  });
});
