"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { verifyEmail } from "@/lib/api/auth";
import useAuthStore from "@/stores/useAuthStore";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const lng = pathname.split("/")[1] || "zh-TW";
  const token = searchParams.get("token");

  const setUser = useAuthStore((s) => s.setUser);
  const setUserConfig = useAuthStore((s) => s.setUserConfig);
  const setSession = useAuthStore((s) => s.setSession);

  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("驗證連結無效");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await verifyEmail(token);
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setMessage("驗證連結無效或已過期，請重新申請驗證信");
          return;
        }
        if (res.data?.user) setUser(res.data.user);
        if (res.data?.config) setUserConfig(res.data.config);
        if (res.accessToken) setSession({ accessToken: res.accessToken });
        setStatus("success");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("驗證連結無效或已過期，請重新申請驗證信");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, setUser, setUserConfig, setSession]);

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 p-6 text-center">
      {status === "verifying" && <p>正在驗證電子郵件…</p>}
      {status === "success" && (
        <>
          <p className="text-lg font-semibold">電子郵件驗證成功</p>
          <p className="text-sm text-muted-foreground">您已自動登入</p>
          <Button asChild>
            <Link href={`/${lng}`}>回到地圖</Link>
          </Button>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-lg font-semibold">驗證失敗</p>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button asChild>
            <Link href={`/${lng}`}>回到首頁</Link>
          </Button>
        </>
      )}
    </div>
  );
}
