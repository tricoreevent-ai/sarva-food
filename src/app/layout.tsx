import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { AuthSessionBridge } from "@/components/auth/auth-session-bridge";
import { FirestoreStoreHydrator } from "@/components/firebase/firestore-store-hydrator";
import { AnalyticsProvider } from "@/components/monitoring/analytics-provider";
import { SyncCenterScope } from "@/components/offline/sync-center-scope";
import { PwaRegistrar } from "@/components/pwa/pwa-registrar";
import { AlertProvider } from "@/components/ui/AlertProvider";
import { AppToaster } from "@/components/ui/app-toaster";
import { I18nProvider } from "@/lib/i18n";
import { MapboxProvider } from "@/components/maps/mapbox-provider";
import { ThemeProvider } from "@/lib/theme-provider";
import { getInitialTheme } from "@/lib/server/theme-preference";
import { resolveThemeMode, THEME_COOKIE_NAME, THEME_STORAGE_KEY, type AppTheme } from "@/lib/theme";
import { BRAND_ASSETS } from "@/lib/brand-assets";
import { APP_DEFAULT_TITLE, APP_DESCRIPTION, APP_NAME, APP_SEO_KEYWORDS } from "@/lib/constants";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://nammude.example"),
  title: {
    default: APP_DEFAULT_TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: APP_SEO_KEYWORDS,
  manifest: "/manifest.json",
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: BRAND_ASSETS.favicon16, sizes: "16x16", type: "image/png" },
      { url: BRAND_ASSETS.favicon32, sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: BRAND_ASSETS.appleTouchIcon,
  },
  openGraph: {
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#3B7A32",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const themeInitScript = `
(function() {
  try {
    var key = "${THEME_STORAGE_KEY}";
    var cookieName = "${THEME_COOKIE_NAME}";
    var cookieTheme = document.cookie.split("; ").find(function(row) { return row.indexOf(cookieName + "=") === 0; });
    var stored = cookieTheme ? decodeURIComponent(cookieTheme.split("=")[1]) : window.localStorage.getItem(key) || "light";
    if (stored !== "light" && stored !== "dark" && stored !== "system") stored = "light";
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

const chunkRecoveryScript = `
(function() {
  var key = "sarva-chunk-recovery";
  function textFrom(value) {
    try {
      if (!value) return "";
      if (typeof value === "string") return value;
      if (value.message) return String(value.message);
      return String(value);
    } catch (error) {
      return "";
    }
  }
  function isChunkFailure(value) {
    var text = textFrom(value);
    return /ChunkLoadError|Loading chunk|Failed to load chunk|_next\\/static\\/chunks/i.test(text);
  }
  function resourceUrl(event) {
    try {
      var target = event && event.target;
      return target && (target.src || target.href) ? String(target.src || target.href) : "";
    } catch (error) {
      return "";
    }
  }
  function clearRuntimeCaches() {
    try {
      if ("caches" in window) {
        caches.keys().then(function(keys) {
          return Promise.all(keys.filter(function(key) {
            return key.indexOf("sarva-") === 0;
          }).map(function(key) {
            return caches.delete(key);
          }));
        }).catch(function() {});
      }
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "SARVA_CLEAR_CACHES" });
      }
    } catch (error) {}
  }
  function recover() {
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, String(Date.now()));
    } catch (error) {
      return;
    }
    clearRuntimeCaches();
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("sarva_recover", String(Date.now()));
      window.location.replace(url.href);
      return;
    } catch (error) {}
    window.location.reload();
  }
  window.addEventListener("error", function(event) {
    if (isChunkFailure(event.error || event.message) || isChunkFailure(resourceUrl(event))) recover();
  }, true);
  window.addEventListener("unhandledrejection", function(event) {
    if (isChunkFailure(event.reason)) recover();
  });
  window.addEventListener("load", function() {
    window.setTimeout(function() {
      try {
        window.sessionStorage.removeItem(key);
      } catch (error) {}
    }, 2000);
  });
})();
`;

const devServiceWorkerResetScript = `
(function() {
  try {
    var host = window.location.hostname;
    var isLocalHost = host === "localhost" || host === "127.0.0.1" || /^10\\.|^172\\.(1[6-9]|2\\d|3[01])\\.|^192\\.168\\./.test(host);
    if (!isLocalHost || window.location.protocol === "https:" || !("serviceWorker" in navigator)) return;
    var reloadKey = "sarva-dev-sw-reset";
    var hadController = !!navigator.serviceWorker.controller;
    var clearCaches = "caches" in window
      ? caches.keys().then(function(keys) {
          return Promise.all(keys.filter(function(key) {
            return key.indexOf("sarva-") === 0;
          }).map(function(key) {
            return caches.delete(key);
          }));
        })
      : Promise.resolve();
    var unregister = navigator.serviceWorker.getRegistrations().then(function(registrations) {
      return Promise.all(registrations.map(function(registration) {
        return registration.unregister();
      }));
    });
    Promise.all([clearCaches, unregister]).then(function() {
      if (hadController && !window.sessionStorage.getItem(reloadKey)) {
        window.sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
        return;
      }
      window.sessionStorage.removeItem(reloadKey);
    }).catch(function() {});
  } catch (error) {}
})();
`;

const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialTheme: AppTheme = await getInitialTheme();
  const initialMode = resolveThemeMode(initialTheme);
  return (
    <html
      lang="en"
      className={initialMode === "dark" ? "dark" : undefined}
      data-theme={initialTheme}
      style={{ colorScheme: initialMode }}
      suppressHydrationWarning
    >
      <head>
        <script id="sarva-theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {process.env.NODE_ENV === "production" ? (
          <script id="sarva-chunk-recovery" dangerouslySetInnerHTML={{ __html: chunkRecoveryScript }} />
        ) : null}
        {process.env.NODE_ENV !== "production" ? (
          <script id="sarva-dev-sw-reset" dangerouslySetInnerHTML={{ __html: devServiceWorkerResetScript }} />
        ) : null}
      </head>
      <body className="antialiased">
        {googleAnalyticsId ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" />
            <Script id="sarva-google-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${googleAnalyticsId}",{send_page_view:false});` }} />
          </>
        ) : null}
        <ThemeProvider initialTheme={initialTheme}>
          <I18nProvider>
            <AlertProvider>
              <MapboxProvider>
                <PwaRegistrar />
                <AuthSessionBridge />
                <FirestoreStoreHydrator />
                <SyncCenterScope />
                <AppToaster />
                <Suspense fallback={null}>
                  <AnalyticsProvider />
                </Suspense>
                {children}
              </MapboxProvider>
            </AlertProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
