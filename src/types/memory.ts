export type MemoryCategory = "preference" | "place" | "habit" | "context";
export type MemorySensitivity = "low" | "medium" | "high";

export interface UserMemory {
  id: string;
  content: string;
  category: MemoryCategory;
  sensitivity: MemorySensitivity;
  source: "explicit_user" | "agent_suggested" | "distilled";
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export interface MemoryListResult {
  memories: UserMemory[];
}

export interface MemoryResult {
  memory: UserMemory;
}

export interface MemorySettingsResult {
  memoryEnabled: boolean;
}

export interface CreateMemoryBody {
  content: string;
  category: MemoryCategory;
  sensitivity?: MemorySensitivity;
  expiresAt?: string;
}

export interface UpdateMemoryBody {
  content?: string;
  category?: MemoryCategory;
  sensitivity?: MemorySensitivity;
  expiresAt?: string | null;
}
