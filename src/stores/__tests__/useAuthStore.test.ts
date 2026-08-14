import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateConfig } from "@/lib/api/user";
import useAuthStore from "@/stores/useAuthStore";
import { ColorEnum, FontSizeEnum, LanguageEnum } from "@/lib/config";
import type { UserDTO } from "@/types/user";

vi.mock("@/lib/api/user", () => ({
  updateConfig: vi.fn().mockResolvedValue({
    ok: true,
    status: "success",
    code: 200,
  }),
}));

const mockUpdateConfig = vi.mocked(updateConfig);

const USER: UserDTO = {
  _id: "user-1",
  name: "測試",
  email: "test@example.com",
  authProviders: ["local"],
  emailVerified: true,
  tokenVersion: 0,
};

describe("useAuthStore.updateUserConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      session: null,
      userConfig: {
        language: LanguageEnum.Chinese,
        darkMode: "system",
        themeColor: ColorEnum.Blue,
        fontSize: FontSizeEnum.Medium,
        notifications: false,
        highContrast: false,
      },
    });
  });

  it("sends remote config WITHOUT user_id (backend rejects user_id with 400)", () => {
    useAuthStore.getState().setUser(USER);
    useAuthStore.getState().updateUserConfig({ darkMode: "dark" });

    expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
    const body = mockUpdateConfig.mock.calls[0][0];
    expect(body).toEqual({ darkMode: "dark" });
    expect(body).not.toHaveProperty("user_id");
  });

  it("only sends the whitelisted remote keys, not local-only fields", () => {
    useAuthStore.getState().setUser(USER);
    useAuthStore
      .getState()
      .updateUserConfig({ darkMode: "dark", highContrast: true });

    expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
    expect(mockUpdateConfig.mock.calls[0][0]).toEqual({ darkMode: "dark" });
  });

  it("does not call the API at all when logged out or for local-only changes", () => {
    // Logged out: remote save must not fire.
    useAuthStore.getState().updateUserConfig({ darkMode: "dark" });
    expect(mockUpdateConfig).not.toHaveBeenCalled();

    // Logged in, but only a local-only key changed: no remote call either.
    useAuthStore.getState().setUser(USER);
    useAuthStore.getState().updateUserConfig({ highContrast: true });
    expect(mockUpdateConfig).not.toHaveBeenCalled();
  });
});
