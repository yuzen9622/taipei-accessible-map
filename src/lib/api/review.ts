import { END_POINT } from "@/lib/config";
import { authenticatedRequest, fetchRequest } from "@/lib/fetch";
import type { ApiResponse } from "@/types/response";
import type {
  CreateReviewInput,
  ReviewItem,
  ReviewListResult,
  ReviewSummaryResult,
  UpdateReviewInput,
} from "@/types/review";

const BASE = `${END_POINT}/api/v1/a11y/reviews`;

export async function getPlaceReviews(
  params: { osmId: string; placeType: string; page?: number; limit?: number },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    osmId: params.osmId,
    placeType: params.placeType,
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
  });
  const response = await fetchRequest(
    `${BASE}?${query.toString()}`,
    signal ? { signal } : undefined,
  );
  return response as ApiResponse<ReviewListResult>;
}

export async function getReviewSummary(
  params: { osmId: string; placeType: string },
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    osmId: params.osmId,
    placeType: params.placeType,
  });
  const response = await fetchRequest(
    `${BASE}/summary?${query.toString()}`,
    signal ? { signal } : undefined,
  );
  return response as ApiResponse<ReviewSummaryResult>;
}

export async function createReview(body: CreateReviewInput) {
  const response = await authenticatedRequest(BASE, {
    method: "POST",
    body,
  });
  return response as ApiResponse<{ review: ReviewItem }>;
}

export async function updateReview(id: string, body: UpdateReviewInput) {
  const response = await authenticatedRequest(`${BASE}/${id}`, {
    method: "PATCH",
    body,
  });
  return response as ApiResponse<{ review: ReviewItem }>;
}

export async function deleteReview(id: string) {
  const response = await authenticatedRequest(`${BASE}/${id}`, {
    method: "DELETE",
  });
  return response as ApiResponse<unknown>;
}
