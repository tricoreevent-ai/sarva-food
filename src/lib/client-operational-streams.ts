"use client";

export function shouldUseOperationalStreams() {
  if (typeof window === "undefined") return false;
  const override = process.env.NEXT_PUBLIC_ENABLE_OPERATIONAL_SSE;
  if (override === "true") return true;
  if (override === "false") return false;
  return !/hostingersite\.com$/i.test(window.location.hostname);
}
