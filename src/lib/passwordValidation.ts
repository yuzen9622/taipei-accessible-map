// Mirrors the backend Zod rules so the frontend can reject obviously
// invalid passwords before hitting the network (backend is still the
// source of truth and re-validates on every request).
const MAX_PASSWORD_BYTES = 72; // bcrypt's hard limit; over this is silently truncated.

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "密碼至少需要 8 個字元";
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return "密碼過長（最多 72 個位元組，純中文約 24 字）";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "密碼必須同時包含英文字母與數字";
  }
  return null;
}
