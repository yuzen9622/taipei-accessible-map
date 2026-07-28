export type PlaceReviewType =
  | "osm"
  | "a11y"
  | "bathroom"
  | "welfare"
  | "parking"
  | "google";

export interface ReviewItem {
  _id: string;
  userId: string;
  rating: number;
  passageWidthRating: number;
  toiletRating: number;
  elevatorRating: number;
  serviceRating: number;
  comment?: string;
  createdAt: string;
}

export interface CreateReviewInput {
  placeId: string;
  placeType: PlaceReviewType;
  passageWidthRating: number;
  toiletRating: number;
  elevatorRating: number;
  serviceRating: number;
  comment?: string;
}

export interface UpdateReviewInput {
  passageWidthRating?: number;
  toiletRating?: number;
  elevatorRating?: number;
  serviceRating?: number;
  comment?: string;
}

export interface ReviewListResult {
  items: ReviewItem[];
  avgRating: number | null;
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface ReviewSummaryResult {
  avgRating: number | null;
  totalCount: number;
  summary: string | null;
  highlights: string[] | null;
}
