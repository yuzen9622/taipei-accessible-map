import { create } from "zustand";
import { logout } from "@/lib/api/auth";
import { updateConfig } from "@/lib/api/user";
import { ColorEnum, FontSizeEnum, LanguageEnum } from "@/lib/config";
import type { UserConfig, UserDTO } from "@/types/user";

const HIGH_CONTRAST_STORAGE_KEY = "userConfig.highContrast";
const REMOTE_CONFIG_KEYS = [
  "language",
  "darkMode",
  "themeColor",
  "fontSize",
  "notifications",
] as const;

function readStoredHighContrast() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredHighContrast(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, String(value));
  } catch {
    // ignore localStorage failures
  }
}

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
    highContrast: readStoredHighContrast(),
    language: LanguageEnum.Chinese,
  },
  session: null,
  setSession: (session) =>
    set((state) => ({ session: { ...state.session, ...session } })),
  setUser: (user) => set({ user }),
  setUserConfig: (config) => {
    set((state) => ({
      userConfig: {
        ...state.userConfig,
        ...config,
        highContrast: readStoredHighContrast(),
      },
    }));
  },
  updateUserConfig: (config) => {
    const user = get().user;
    if (typeof config.highContrast === "boolean") {
      writeStoredHighContrast(config.highContrast);
    }

    const remoteConfig = Object.fromEntries(
      REMOTE_CONFIG_KEYS.flatMap((key) =>
        key in config ? [[key, config[key]]] : [],
      ),
    );

    if (user && Object.keys(remoteConfig).length > 0) {
      updateConfig({ user_id: user._id, ...remoteConfig });
    }
    set((state) => ({ userConfig: { ...state.userConfig, ...config } }));
  },
  logout: async () => {
    await logout();
    set({ user: null, session: null });
  },
}));

export default useAuthStore;
