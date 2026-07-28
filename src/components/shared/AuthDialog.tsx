"use client";

import { GoogleLogin } from "@react-oauth/google";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  forgotPassword,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  resendVerificationEmail,
} from "@/lib/api/auth";
import { ApiError } from "@/lib/fetch";
import { validatePassword } from "@/lib/passwordValidation";
import useAuthStore from "@/stores/useAuthStore";
import type { UserConfig, UserDTO } from "@/types/user";

type Mode = "login" | "register" | "forgot";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful interactive login (Google or email/password). */
  onLoggedIn?: (user: UserDTO) => void;
}

export default function AuthDialog({
  open,
  onOpenChange,
  onLoggedIn,
}: AuthDialogProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registered, setRegistered] = useState<null | { emailSent: boolean }>(
    null,
  );
  const [forgotSent, setForgotSent] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleBtnWidth, setGoogleBtnWidth] = useState(320);

  useEffect(() => {
    const el = googleBtnRef.current;
    if (!el || !open) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setGoogleBtnWidth(Math.round(width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const { setUser, setSession, setUserConfig } = useAuthStore(
    useShallow((s) => ({
      setUser: s.setUser,
      setSession: s.setSession,
      setUserConfig: s.setUserConfig,
    })),
  );

  const reset = () => {
    setMode("login");
    setName("");
    setEmail("");
    setPassword("");
    setError(null);
    setNeedsVerification(false);
    setRegistered(null);
    setForgotSent(false);
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const applySession = (data: {
    user?: UserDTO;
    config?: UserConfig;
    accessToken?: string;
  }) => {
    if (data.user) setUser(data.user);
    if (data.config) setUserConfig(data.config);
    if (data.accessToken) setSession({ accessToken: data.accessToken });
  };

  const handleGoogleSuccess = async (credential: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loginWithGoogle(credential);
      if (!res.ok) {
        setError(res.message || "Google 登入失敗");
        return;
      }
      applySession({
        user: res.data?.user,
        config: res.data?.config,
        accessToken: res.accessToken,
      });
      handleOpenChange(false);
      if (res.data?.user) onLoggedIn?.(res.data.user);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google 登入失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerificationEmail(email);
      toast.success("驗證信已寄出，請至信箱查收");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重寄驗證信失敗");
    }
  };

  const handleLogin = async () => {
    setError(null);
    setNeedsVerification(false);
    setLoading(true);
    try {
      const res = await loginWithEmail(email, password);
      if (!res.ok) {
        // The only case fetchRequest returns without throwing is a 401.
        setError("電子郵件或密碼錯誤");
        return;
      }
      applySession({
        user: res.data?.user,
        config: res.data?.config,
        accessToken: res.accessToken,
      });
      handleOpenChange(false);
      if (res.data?.user) onLoggedIn?.(res.data.user);
    } catch (err) {
      if (err instanceof ApiError && err.code === 403) {
        setNeedsVerification(true);
        setError("請先完成信箱驗證");
      } else if (err instanceof ApiError && err.code === 429) {
        toast.error("登入嘗試過於頻繁，請稍後再試");
      } else {
        toast.error(err instanceof Error ? err.message : "登入失敗");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setLoading(true);
    try {
      const res = await registerWithEmail(name, email, password);
      if (res.ok) {
        setRegistered({ emailSent: res.data?.emailSent ?? true });
      } else {
        setError(res.message || "註冊失敗");
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 409) {
        setError("這個電子郵件已被註冊");
      } else {
        setError(err instanceof Error ? err.message : "註冊失敗");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setForgotSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 503) {
        setError("寄信服務暫時無法使用，請稍後再試");
      } else {
        setForgotSent(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const showTabs = mode !== "forgot" && !registered;
  const showGoogle = mode !== "forgot" && !registered;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[380px] rounded-2xl p-6 sm:p-7">
        <DialogHeader className="items-center gap-1 text-center">
          <Image
            src="/logo.webp"
            alt=""
            width={40}
            height={40}
            className="mb-1 rounded-xl"
          />
          <DialogTitle className="text-xl font-semibold">
            {mode === "login" && "歡迎回來"}
            {mode === "register" && "建立新帳號"}
            {mode === "forgot" && "重設密碼"}
          </DialogTitle>
          {mode !== "forgot" && (
            <p className="text-xs text-muted-foreground">
              登入無障礙智慧地圖，享有完整功能
            </p>
          )}
        </DialogHeader>

        {showTabs && (
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setError(null);
              setMode(v as Mode);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="login">登入</TabsTrigger>
              <TabsTrigger value="register">註冊</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {showGoogle && (
          <div ref={googleBtnRef} className="flex w-full justify-center">
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  void handleGoogleSuccess(credentialResponse.credential);
                }
              }}
              onError={() => toast.error("Google 登入失敗")}
              theme="outline"
              size="large"
              text="continue_with"
              shape="pill"
              width={googleBtnWidth}
            />
          </div>
        )}

        {showGoogle && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              或使用電子郵件
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {mode === "register" && registered ? (
          <div className="space-y-3 text-sm">
            <p>
              {registered.emailSent
                ? "註冊成功，請至信箱點擊驗證連結後即可登入"
                : "帳號已建立，但驗證信寄送失敗，請重新寄送"}
            </p>
            {!registered.emailSent && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleResend}
              >
                重新寄送驗證信
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => {
                setRegistered(null);
                setMode("login");
                setPassword("");
              }}
            >
              前往登入
            </Button>
          </div>
        ) : mode === "forgot" ? (
          forgotSent ? (
            <div className="space-y-3 text-sm">
              <p>若該信箱已註冊，重設密碼信已寄出，請至信箱查收</p>
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => setMode("login")}
              >
                返回登入
              </Button>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void handleForgot();
              }}
            >
              <Input
                type="email"
                placeholder="電子郵件"
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                寄送重設密碼信
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground hover:underline"
                onClick={() => setMode("login")}
              >
                返回登入
              </button>
            </form>
          )
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void (mode === "login" ? handleLogin() : handleRegister());
            }}
          >
            {mode === "register" && (
              <Input
                placeholder="暱稱"
                className="h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <Input
              type="email"
              placeholder="電子郵件"
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="space-y-1.5">
              <Input
                type="password"
                placeholder="密碼"
                className="h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {mode === "login" && (
                <button
                  type="button"
                  className="block text-xs text-muted-foreground hover:underline"
                  onClick={() => {
                    setError(null);
                    setMode("forgot");
                  }}
                >
                  忘記密碼？
                </button>
              )}
            </div>
            {error && (
              <div className="space-y-1.5">
                <p className="text-xs text-destructive">{error}</p>
                {needsVerification && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={handleResend}
                  >
                    重新寄送驗證信
                  </button>
                )}
              </div>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {mode === "login" ? "登入" : "註冊"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
