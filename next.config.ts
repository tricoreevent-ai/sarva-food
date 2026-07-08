import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  analyzerMode: "static",
  logLevel: "info",
  openAnalyzer: false,
});

const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  "192.168.1.14",
  "192.168.1.15",
  process.env.NEXT_PUBLIC_LAN_HOST,
].filter(Boolean) as string[];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins,
  productionBrowserSourceMaps: false,
  experimental: {
    webpackBuildWorker: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "api.mapbox.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
      },
    ];
    const htmlNoStoreHeaders = [
      { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0, proxy-revalidate" },
      { key: "CDN-Cache-Control", value: "no-store" },
      { key: "Surrogate-Control", value: "no-store" },
      { key: "Pragma", value: "no-cache" },
      { key: "Expires", value: "0" },
    ];
    const publicHtmlHeaders = [...securityHeaders, ...htmlNoStoreHeaders];

    return [
      {
        source: "/admin/:path*",
        headers: [
          ...publicHtmlHeaders,
          { key: "Vary", value: "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, Accept-Encoding" },
        ],
      },
      {
        source: "/owner/:path*",
        headers: [
          ...publicHtmlHeaders,
          { key: "Vary", value: "RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, Accept-Encoding" },
        ],
      },
      { source: "/", headers: publicHtmlHeaders },
      { source: "/restaurant/:path*", headers: publicHtmlHeaders },
      { source: "/restaurants/:path*", headers: publicHtmlHeaders },
      { source: "/offers/:path*", headers: publicHtmlHeaders },
      { source: "/schedule/:path*", headers: publicHtmlHeaders },
      { source: "/orders/:path*", headers: publicHtmlHeaders },
      { source: "/profile/:path*", headers: publicHtmlHeaders },
      { source: "/checkout/:path*", headers: publicHtmlHeaders },
      { source: "/manifest.json", headers: publicHtmlHeaders },
      { source: "/api/release-info", headers: publicHtmlHeaders },
      {
        source: "/_next/static/css/:path*",
        headers: [
          { key: "Content-Type", value: "text/css; charset=utf-8" },
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/icons/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/portal/login",
        destination: "/owner/login",
        permanent: false,
      },
      {
        source: "/pos",
        destination: "/owner/pos",
        permanent: false,
      },
      {
        source: "/pos/:path*",
        destination: "/owner/pos",
        permanent: false,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
