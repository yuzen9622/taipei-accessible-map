/**
 * Persist the victim's own active SOS session id across page reloads.
 *
 * The SOS lifecycle otherwise lives entirely in `SosDialog` component state,
 * so a refresh (or an accidental navigation) would silently drop an active
 * emergency. We stash only the session id here and re-validate it against
 * `GET /sessions/:id` on boot — the server remains the source of truth for
 * whether the session is still active.
 */

const KEY = "sos.activeSession";
// Don't resurrect a session the user forgot about days later; the server
// would likely have expired it anyway.
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h

interface StoredSos {
  sessionId: string;
  savedAt: number;
}

export function saveActiveSos(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredSos = { sessionId, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // storage unavailable (private mode / quota) — recovery just won't work
  }
}

export function loadActiveSos(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSos>;
    if (!parsed?.sessionId) return null;
    if (Date.now() - (parsed.savedAt ?? 0) > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed.sessionId;
  } catch {
    return null;
  }
}

export function clearActiveSos(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
