import "server-only";

import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";

export type TraceContext = {
  requestId: string;
  correlationId: string;
  traceId: string;
  transactionId: string;
  tenantId?: string;
  restaurantId?: string;
  userId?: string;
  method?: string;
  path?: string;
  startedAt: number;
};

type TraceSeed = Partial<Pick<TraceContext, "tenantId" | "restaurantId" | "userId">>;

export function createTraceContext(request: NextRequest, seed: TraceSeed = {}): TraceContext {
  const requestId = cleanId(request.headers.get("x-request-id")) ?? shortId("REQ");
  return {
    requestId,
    correlationId: cleanId(request.headers.get("x-correlation-id")) ?? requestId,
    traceId: randomUUID(),
    transactionId: cleanId(request.headers.get("x-transaction-id")) ?? shortId("TX"),
    method: request.method,
    path: request.nextUrl.pathname,
    startedAt: Date.now(),
    ...seed,
  };
}

export function extendTrace(context: TraceContext, seed: TraceSeed): TraceContext {
  return { ...context, ...seed };
}

export function traceDurationMs(context: TraceContext) {
  return Date.now() - context.startedAt;
}

export function traceLogFields(context: TraceContext) {
  return {
    requestId: context.requestId,
    correlationId: context.correlationId,
    traceId: context.traceId,
    transactionId: context.transactionId,
    tenantId: context.tenantId,
    restaurantId: context.restaurantId,
    userId: context.userId,
    method: context.method,
    path: context.path,
  };
}

export function publicTraceMeta(context: TraceContext) {
  return { requestId: context.requestId };
}

function shortId(prefix: string) {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

function cleanId(value: string | null) {
  const id = String(value ?? "").replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 80);
  return id || undefined;
}
