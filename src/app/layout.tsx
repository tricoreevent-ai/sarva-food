import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { AuthSessionBridge } from "@/components/auth/auth-session-bridge";
import { FirestoreStoreHydrator } from "@/components/firebase/firestore-store-hydrator";
import { AnalyticsProvider } from "@/components/monitoring/analytics-provider";
import { SyncCenterScope } from "@/components/offline/sync-center-scope";
import { PwaRegistrar } from "@/components/pwa/pwa-registrar";
import { AppStartupGate } from "@/components/mobile/app-startup-gate";
import { AppToaster } from "@/components/ui/app-toaster";
import { I18nProvider } from "@/lib/i18n";
import { MapboxProvider } from "@/components/maps/mapbox-provider";
import { ThemeProvider } from "@/lib/theme-provider";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://sarva-food.example"),
  title: {
    default: `${APP_NAME} Commerce Ecosystem`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: "/icons/sarva-icon.svg",
    apple: "/icons/sarva-icon.svg",
  },
  openGraph: {
    title: `${APP_NAME} Commerce Ecosystem`,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} Commerce Ecosystem`,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#006b5f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const themeInitScript = `
(function() {
  try {
    var key = "sarva-theme";
    var stored = window.localStorage.getItem(key) || "system";
    if (stored !== "light" && stored !== "dark" && stored !== "system") stored = "system";
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored === "dark" || (stored === "system" && prefersDark);
    var root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    root.dataset.theme = stored;
  } catch (error) {
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Script id="sarva-theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <I18nProvider>
            <MapboxProvider>
              <PwaRegistrar />
              <AppStartupGate />
              <AuthSessionBridge />
              <FirestoreStoreHydrator />
              <SyncCenterScope />
              <AppToaster />
              <Suspense fallback={null}>
                <AnalyticsProvider />
              </Suspense>
              {children}
            </MapboxProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
