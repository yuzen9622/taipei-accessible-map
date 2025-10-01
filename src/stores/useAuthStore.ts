import { create } from "zustand";
import { ColorEnum, FontSizeEnum, LanguageEnum } from "@/lib/config";
import type { UserConfig, UserDTO } from "@/types/user";

interface AuthState {
  user: UserDTO | null;
  userConfig: UserConfig;
  session: { accessToken: string } | null;
}

interface AuthAction {
  setUser: (user: UserDTO | null) => void;
  setUserConfig: (config: Partial<UserConfig>) => void;
  setSession: (session: { accessToken: string }) => void;
}

type AuthStore = AuthState & AuthAction;
const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  userConfig: {
    themeColor: ColorEnum.Default,
    darkMode: false,
    fontSize: FontSizeEnum.Medium,
    notifications: false,
    language: LanguageEnum.Chinese,
  },
  session: null,
  setSession: (session) =>
    set((state) => ({ session: { ...state.session, ...session } })),
  setUser: (user) => set({ user }),
  setUserConfig: (config) =>
    set((state) => ({ userConfig: { ...state.userConfig, ...config } })),
}));

export default useAuthStore;
