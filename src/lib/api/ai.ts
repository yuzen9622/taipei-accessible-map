import { END_POINT } from "@/lib/config";
import { fetchRequest, getAccessToken } from "@/lib/fetch";
import type { ApiResponse } from "@/types/response";
import type { AccessibleRoute, RouteExplanation, RouteIntent } from "@/types/route";

export type ChatMessage = { role: "system"|"user"|"assistant"|"tool"; content: string|null; name?: string; tool_call_id?: string };
export type AgentChatRequest = { messages: ChatMessage[]; model?: string; stream?: boolean; temperature?: number; userLocation?: { latitude: number; longitude: number } };

export async function chatWithAgent(request: AgentChatRequest) {
  return fetchRequest(`${END_POINT}/ai/chat`, { method: "POST", body: { ...request, stream: false } }) as Promise<ApiResponse<unknown>>;
}

export async function streamChatWithAgent(request: AgentChatRequest, onChunk: (text: string) => void, onToolCall?: (name: string, args: unknown) => void, signal?: AbortSignal): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${END_POINT}/ai/chat`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ ...request, stream: true }), signal });
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim() || line.startsWith("event:")) continue;
      if (line.startsWith("data: ")) {
        const raw = line.slice(6);
        if (raw === "[DONE]") return;
        try { const chunk = JSON.parse(raw); if (chunk.name && chunk.arguments !== undefined) { onToolCall?.(chunk.name, chunk.arguments); continue; } const delta = chunk?.choices?.[0]?.delta?.content; if (delta) onChunk(delta); } catch {}
      }
    }
  }
}

export async function parseIntent(query: string) {
  return fetchRequest(`${END_POINT}/ai/intent`, { method: "POST", body: { query } }) as Promise<ApiResponse<RouteIntent>>;
}

export async function explainRoute(route: AccessibleRoute, mode: RouteIntent["mode"] = "normal", language: "zh-TW"|"en" = "zh-TW") {
  return fetchRequest(`${END_POINT}/ai/explain`, { method: "POST", body: { route, mode, language } }) as Promise<ApiResponse<RouteExplanation>>;
}
