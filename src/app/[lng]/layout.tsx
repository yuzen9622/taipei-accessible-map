import type { Metadata } from "next";
import "@/app/globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { dir } from "i18next";
import { Geist, Geist_Mono } from "next/font/google";
import ClientLayout from "@/components/layout/client-layout";
import GoogleMapProvider from "@/components/provider/GoogleMapProvider";
import { ThemeProvider } from "@/components/provider/ThemeProvider";
import TestDrawer from "@/components/TestDrawer";
import { Toaster } from "@/components/ui/sonner";
import type { languages } from "@/i18n/setting";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "無障礙台北 - Accessible Taipei",
  description:
    "無障礙台北 - Accessible Taipei 一款專為無障礙設計的地圖，並且支援路線規劃，讓身障人士也能輕鬆找到適合自己的路線。",
  icons: {
    icon: "/logo.ico",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lng: (typeof languages)[number] }>;
}>) {
  const { lng } = await params;

  return (
    <html suppressHydrationWarning={true} lang={lng} dir={dir(lng)}>
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined"
          rel="stylesheet"
        ></link>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleMapProvider>
          <GoogleOAuthProvider
            clientId={process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? ""}
          >
            <ThemeProvider defaultTheme="system" attribute="class" enableSystem>
              <ClientLayout>
                <TestDrawer />
                {children}
              </ClientLayout>
            </ThemeProvider>
          </GoogleOAuthProvider>
        </GoogleMapProvider>
        <Toaster />
      </body>
    </html>
  );
}
