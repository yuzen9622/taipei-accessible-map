import { END_POINT } from "@/lib/config";
import { authenticatedRequest } from "@/lib/fetch";
import type {
  CreateMemoryBody,
  MemoryListResult,
  MemoryResult,
  UpdateMemoryBody,
} from "@/types/memory";
import type { ApiResponse } from "@/types/response";

const MEMORY_BASE = `${END_POINT}/api/v1/ai/memories`;

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
