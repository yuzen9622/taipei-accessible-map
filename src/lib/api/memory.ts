import { END_POINT } from "@/lib/config";
import { authenticatedRequest } from "@/lib/fetch";
import type {
  CreateMemoryBody,
  MemoryListResult,
  MemoryResult,
  MemorySettingsResult,
  UpdateMemoryBody,
} from "@/types/memory";
import type { ApiResponse } from "@/types/response";

const MEMORY_BASE = `${END_POINT}/api/v1/ai/memories`;

export async function getMemorySettings() {
  return authenticatedRequest(`${MEMORY_BASE}/settings`, {
    method: "GET",
  }) as Promise<ApiResponse<MemorySettingsResult>>;
}

export async function updateMemorySettings(memoryEnabled: boolean) {
  return authenticatedRequest(`${MEMORY_BASE}/settings`, {
    method: "PATCH",
    body: { memoryEnabled },
  }) as Promise<ApiResponse<MemorySettingsResult>>;
}

export async function listMemories(limit = 100) {
  return authenticatedRequest(`${MEMORY_BASE}?limit=${limit}`, {
    method: "GET",
  }) as Promise<ApiResponse<MemoryListResult>>;
}

export async function createMemory(body: CreateMemoryBody) {
  return authenticatedRequest(MEMORY_BASE, {
    method: "POST",
    body,
  }) as Promise<ApiResponse<MemoryResult>>;
}

export async function updateMemory(id: string, body: UpdateMemoryBody) {
  return authenticatedRequest(`${MEMORY_BASE}/${id}`, {
    method: "PATCH",
    body,
  }) as Promise<ApiResponse<MemoryResult>>;
}
