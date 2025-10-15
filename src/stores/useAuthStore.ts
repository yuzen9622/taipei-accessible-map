import { create } from "zustand";
import { logout } from "@/lib/api/auth";
import { updateConfig } from "@/lib/api/user";
import { ColorEnum, FontSizeEnum, LanguageEnum } from "@/lib/config";
import type { UserConfig, UserDTO } from "@/types/user";

interface AuthState {
  user: UserDTO | null;
  userConfig: UserConfig;
  session: { accessToken: string } | null;
}

interface AuthAction {
  setUser: (user: UserDTO | null) => void;
  setUserConfig: (config: UserConfig) => void;
  setSession: (session: { accessToken: string }) => void;
  updateUserConfig: (config: Partial<UserConfig>) => void;
  logout: () => void;
}

type AuthStore = AuthState & AuthAction;
const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  userConfig: {
    themeColor: ColorEnum.Default,
    darkMode: "system",
    fontSize: FontSizeEnum.Medium,
    notifications: false,
    language: LanguageEnum.Chinese,
  },
  session: null,
  setSession: (session) =>
    set((state) => ({ session: { ...state.session, ...session } })),
  setUser: (user) => set({ user }),
  setUserConfig: (config) => {
    set((state) => ({ userConfig: { ...state.userConfig, ...config } }));
  },
  updateUserConfig: (config) => {
    const user = get().user;
    console.log("Updating user config:", config);
    if (user) {
      updateConfig({ user_id: user._id, ...config });
    }
    set((state) => ({ userConfig: { ...state.userConfig, ...config } }));
  },
  logout: async () => {
    await logout();
    set({ user: null, session: null });
  },
}));

export default useAuthStore;
