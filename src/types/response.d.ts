export interface ApiResponse<T> {
  ok: boolean;
  status: "success" | "error";
  code: number;
  message: string;
  data?: T;
  accessToken?: string;
  refreshToken?: string;
}
