import type { Metadata, Viewport } from "next";
import { Noto_Sans_Arabic, Tajawal } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { AreaProvider } from "@/contexts/AreaContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { ConfirmationOverridesProvider } from "@/contexts/ConfirmationOverridesContext";
import { ConfirmFlagExclusivityProvider } from "@/contexts/ConfirmFlagExclusivityContext";
import { FlagOverridesProvider } from "@/contexts/FlagOverridesContext";

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-arabic",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["500", "700", "800"],
  display: "swap",
  variable: "--font-tajawal",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://gaza-price-frontend.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "غزة بريس — أسعار شفافة",
  description: "مقارنة أسعار المواد الأساسية في غزة — قوة المجتمع",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "غزة بريس — أسعار شفافة",
    description: "مقارنة أسعار المواد الأساسية في غزة — قوة المجتمع",
    type: "website",
    locale: "ar_EG",
    url: appUrl,
    siteName: "غزة بريس",
    images: [
      {
        url: `${appUrl}/og-image.png`,
        width: 630,
        height: 630,
        alt: "غزة بريس — أسعار شفافة · قوة المجتمع",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "غزة بريس — أسعار شفافة",
    description: "مقارنة أسعار المواد الأساسية في غزة — قوة المجتمع",
    images: [`${appUrl}/og-image.png`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4A7C59",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${notoSansArabic.variable} ${tajawal.variable}`} suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        <QueryProvider>
          <SessionProvider>
          <AreaProvider>
          <ConfirmationOverridesProvider>
            <FlagOverridesProvider>
              <ConfirmFlagExclusivityProvider>
              <div className="app-shell">
                {children}
              </div>
              </ConfirmFlagExclusivityProvider>
            </FlagOverridesProvider>
          </ConfirmationOverridesProvider>
          </AreaProvider>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
