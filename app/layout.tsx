import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ConfirmationOverridesProvider } from "@/contexts/ConfirmationOverridesContext";
import { ConfirmFlagExclusivityProvider } from "@/contexts/ConfirmFlagExclusivityContext";
import { FlagOverridesProvider } from "@/contexts/FlagOverridesContext";

export const metadata: Metadata = {
  title: "غزة بريس — أسعار شفافة",
  description: "مقارنة أسعار المواد الأساسية في غزة — قوة المجتمع",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
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
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600&family=Tajawal:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <QueryProvider>
          <ConfirmationOverridesProvider>
            <FlagOverridesProvider>
              <ConfirmFlagExclusivityProvider>
              <div className="app-shell">
                {children}
              </div>
              </ConfirmFlagExclusivityProvider>
            </FlagOverridesProvider>
          </ConfirmationOverridesProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
