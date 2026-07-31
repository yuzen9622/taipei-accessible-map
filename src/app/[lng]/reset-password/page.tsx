"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import StatusPage from "@/components/shared/StatusPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/fetch";
import { validatePassword } from "@/lib/passwordValidation";
import useAuthStore from "@/stores/useAuthStore";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const lng = pathname.split("/")[1] || "zh-TW";
  const token = searchParams.get("token");

  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("重設連結無效");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      if (!res.ok) {
        setError("重設連結無效或已過期，請重新申請");
        return;
      }
      if (res.data?.user) setUser(res.data.user);
      if (res.accessToken) setSession({ accessToken: res.accessToken });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "重設連結無效或已過期，請重新申請",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <StatusPage
        status="error"
        title="重設連結無效"
        primaryAction={{ label: "回到首頁", href: `/${lng}` }}
      />
    );
  }

  if (success) {
    return (
      <StatusPage
        status="success"
        title="密碼已重設，請使用新密碼登入"
        description="您已自動登入"
        primaryAction={{ label: "回到地圖", href: `/${lng}` }}
      />
    );
  }

  // The active form step isn't a "result" the shared shell models — it stays
  // a bespoke form, still inside the same StatusPage card for visual
  // consistency with the two result states above and below it. No status
  // icon applies to an in-progress form, so it's hidden rather than showing
  // a misleading spinner or checkmark.
  return (
    <StatusPage status="pending" hideIcon title="設定新密碼">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="password"
          placeholder="新密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          重設密碼
        </Button>
      </form>
    </StatusPage>
  );
}
