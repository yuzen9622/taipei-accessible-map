import type { ColorEnum, FontSizeEnum, LanguageEnum } from "@/lib/config";

export interface UserDTO {
  _id?: string;
  name: string;
  email: string;
  avatar?: string;
  /** null for accounts that never linked Google (email/password-only). */
  client_id?: string | null;
  /** "google" | "local", may contain both once a Google user sets a password. */
  authProviders?: string[];
  emailVerified?: boolean;
  tokenVersion?: number;
  lineUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserConfig {
  language: LanguageEnum;
  darkMode: "light" | "dark" | "system";
  themeColor: ColorEnum;
  fontSize: FontSizeEnum;
  notifications: boolean;
  highContrast: boolean;
  user_id?: string;
}

export interface RefreshToken {
  accessToken: string;
  user: UserDTO;
  refreshToken?: string;
}
