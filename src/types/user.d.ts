import type { ColorEnum, FontSizeEnum, LanguageEnum } from "@/lib/config";

export interface UserDTO {
  _id?: string;
  name: string;
  email: string;
  avatar?: string;
  client_id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserConfig {
  language: LanguageEnum;
  darkMode: "light" | "dark" | "system";
  themeColor: ColorEnum;
  fontSize: FontSizeEnum;
  notifications: boolean;
  user_id?: string;
}

export interface RefreshToken {
  accessToken: string;
  user: UserDTO;
  refreshToken?: string;
}
