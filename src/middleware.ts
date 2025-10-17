import { type NextRequest, NextResponse } from "next/server";
import { fallbackLng, languages } from "@/i18n/setting";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js).*)"],
};

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (
    path.includes(".") ||
    path.startsWith("/_next") ||
    path.startsWith("/api") ||
    path.startsWith("/assets")
  ) {
    return NextResponse.next();
  }
  // 路徑已經帶語系前綴就 pass
  if (languages.some((l: string) => path.startsWith(`/${l}`))) {
    return NextResponse.next();
  }

  // 否則導向 fallback 或從 userConfig/header 取語言
  const lng = fallbackLng;
  return NextResponse.redirect(new URL(`/${lng}`, req.url));
}
