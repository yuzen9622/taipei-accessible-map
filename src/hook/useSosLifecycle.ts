"use client";

import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useEffect, useState } from "react";
import { getSosSession } from "@/lib/api/sos";
import { END_POINT } from "@/lib/config";
import { getAccessToken } from "@/lib/fetch";
import type { SosSnapshot } from "@/types/sos";

const POLL_MS = 8000;
// Consecutive stream failures before we abandon SSE for plain polling.
const MAX_STREAM_RETRIES = 3;

export type SosLifecycleStatus =
  | "connecting"
  | "streaming"
  | "polling"
  | "error";

/**
 * Owner-only realtime view of an SOS session for the victim's own screen.
 *
 * Strategy (per the migration plan): seed with an immediate
 * `GET /sessions/:id` snapshot, then subscribe to the SSE `update` stream
 * via `fetchEventSource` (which — unlike the native `EventSource` — can send
 * the `Authorization: Bearer` header this app's auth relies on). If the
 * stream can't be established or keeps dropping, fall back to polling the
 * same snapshot endpoint every {@link POLL_MS}ms.
 *
 * Pass `enabled=false` (e.g. once the session is resolved, or the dialog is
 * closed) to tear the connection down.
 */
export function useSosLifecycle(sessionId: string | null, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<SosSnapshot | null>(null);
  const [status, setStatus] = useState<SosLifecycleStatus>("connecting");

  useEffect(() => {
    if (!sessionId || !enabled) {
      setSnapshot(null);
      setStatus("connecting");
      return;
    }

    let disposed = false;
    const ctrl = new AbortController();
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const apply = (snap: SosSnapshot | null | undefined) => {
      if (!disposed && snap) setSnapshot(snap);
    };

    const startPolling = () => {
      if (disposed || pollTimer) return;
      setStatus("polling");
      const tick = async () => {
        try {
          // authenticatedRequest transparently refreshes an expired token,
          // so polling also recovers the auth failures that killed the stream.
          const res = await getSosSession(sessionId);
          apply(res.data);
        } catch {
          if (!disposed) setStatus("error");
        }
      };
      void tick();
      pollTimer = setInterval(tick, POLL_MS);
    };

    const streamUrl = `${END_POINT}/api/v1/sos/sessions/${encodeURIComponent(
      sessionId,
    )}/stream`;

    (async () => {
      // Seed immediately so the UI has data before the first SSE event fires.
      try {
        const res = await getSosSession(sessionId);
        apply(res.data);
      } catch {
        // ignore — the stream (or polling fallback) will retry
      }
      if (disposed) return;

      let retries = 0;
      const token = await getAccessToken();

      try {
        await fetchEventSource(streamUrl, {
          signal: ctrl.signal,
          // SOS must keep updating even when the tab is backgrounded.
          openWhenHidden: true,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          onopen: async (res) => {
            if (res.ok) {
              retries = 0;
              if (!disposed) setStatus("streaming");
              return;
            }
            throw new Error(`SSE open failed: ${res.status}`);
          },
          onmessage: (ev) => {
            // Backend emits `event: update` with a SosSnapshot JSON payload;
            // `: ping` heartbeats arrive as comments and never reach here.
            if (ev.event === "update" && ev.data) {
              try {
                apply(JSON.parse(ev.data) as SosSnapshot);
              } catch {
                // malformed frame — ignore, next event or poll will correct it
              }
            }
          },
          onerror: (err) => {
            retries += 1;
            if (retries >= MAX_STREAM_RETRIES) {
              throw err; // stop retrying → caught below → polling fallback
            }
            return Math.min(1000 * retries, 5000);
          },
        });
      } catch {
        // Stream permanently failed (not a deliberate teardown) → poll.
        if (!disposed && !ctrl.signal.aborted) startPolling();
      }
    })();

    return () => {
      disposed = true;
      ctrl.abort();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [sessionId, enabled]);

  return { snapshot, status };
}
