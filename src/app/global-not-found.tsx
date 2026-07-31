import "@/app/globals.css";
import StatusPage from "@/components/shared/StatusPage";
import type { languages } from "@/i18n/setting";

export default async function NotFound({
  params,
}: Readonly<{
  params: Promise<{ lng: (typeof languages)[number] }>;
}>) {
  const { lng } = await params;
  return (
    <html lang={lng}>
      <body>
        <StatusPage
          status="notFound"
          title="找不到頁面"
          description="您要找的頁面不存在、已移動或暫時不可用。"
          code="404"
          primaryAction={{ label: "回首頁", href: "/" }}
        />
      </body>
    </html>
  );
}
