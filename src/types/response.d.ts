export interface ApiResponse<T> {
  ok: boolean;
  status: "success" | "error";
  code: string;
  message: string;
  data?: T;
  accessToken?: string;
  refreshToken?: string;
}
