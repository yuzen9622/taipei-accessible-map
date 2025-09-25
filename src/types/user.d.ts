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
  language: string;
  darkMode: boolean;
  themeColor: string;
  fontSize: number;
  notifications: boolean;
}

export interface RefreshToken {
  accessToken: string;
  user: UserDTO;
  refreshToken?: string;
}
