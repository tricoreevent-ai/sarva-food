import { NextResponse } from "next/server";

const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: Request, scope: string, limit = 60, windowMs = 60_000) {
  const now = Date.now(); const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"; const key = `${scope}:${ip}`; const current = windows.get(key);
  if (!current || current.resetAt <= now) { windows.set(key, { count: 1, resetAt: now + windowMs }); prune(now); return null; }
  current.count += 1;
  if (current.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return NextResponse.json({ error: "Too many requests. Wait briefly and try again.", code: "RATE_LIMITED", retryAfter }, { status: 429, headers: { "retry-after": String(retryAfter), "cache-control": "no-store" } });
}

function prune(now: number) { if (windows.size < 2000) return; for (const [key, value] of windows) if (value.resetAt <= now) windows.delete(key); }
