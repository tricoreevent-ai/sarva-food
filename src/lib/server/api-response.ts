import "server-only";

import { NextResponse } from "next/server";
import { productionLogger, safeErrorName, safeErrorReason } from "@/lib/server/production-logger";
import { publicTraceMeta, traceLogFields, type TraceContext } from "@/lib/server/request-trace";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly code = "UNKNOWN_ERROR",
    readonly expose = status < 500,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Request validation failed.") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class BusinessRuleError extends ApiError {
  constructor(message = "This action is not allowed right now.", status = 409) {
    super(message, status, "BUSINESS_RULE_ERROR");
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = "Access is not allowed.") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class PaymentError extends ApiError {
  constructor(message = "Payment could not be completed.", status = 502) {
    super(message, status, "PAYMENT_ERROR");
  }
}

export class PrinterError extends ApiError {
  constructor(message = "Printer action could not be completed.", status = 503) {
    super(message, status, "PRINTER_ERROR");
  }
}

export class FirestoreError extends ApiError {
  constructor(message = "Data service is unavailable.", status = 503) {
    super(message, status, "FIRESTORE_ERROR", false);
  }
}

export class NetworkError extends ApiError {
  constructor(message = "Network service is unavailable.", status = 503) {
    super(message, status, "NETWORK_ERROR");
  }
}

export class RateLimitError extends ApiError {
  constructor(message = "Too many requests. Please retry shortly.") {
    super(message, 429, "RATE_LIMIT_ERROR");
  }
}

export class UnknownError extends ApiError {
  constructor(message = "Request could not be completed. Please try again.") {
    super(message, 500, "UNKNOWN_ERROR", false);
  }
}

export function apiOk(data: unknown, trace: TraceContext, init?: ResponseInit & { count?: number }) {
  const { count, ...responseInit } = init ?? {};
  return NextResponse.json({ data, meta: { ...publicTraceMeta(trace), ...(count === undefined ? {} : { count }) } }, responseInit);
}

export function apiError(error: unknown, trace: TraceContext, fallback = "Request could not be completed. Please try again.", status = 500) {
  const normalized = normalizeApiError(error, fallback, status);
  if (normalized.status >= 500) {
    productionLogger.error("api.error", {
      ...traceLogFields(trace),
      statusCode: normalized.status,
      errorName: safeErrorName(error),
      reason: safeErrorReason(error),
    });
  }
  return NextResponse.json(
    {
      error: normalized.expose ? normalized.message : fallback,
      code: normalized.code,
      requestId: trace.requestId,
      meta: publicTraceMeta(trace),
    },
    { status: normalized.status },
  );
}

export function normalizeApiError(error: unknown, fallback = "Request could not be completed. Please try again.", status = 500) {
  if (error instanceof ApiError) return error;
  const message = error instanceof Error ? error.message : "";
  if (/rate.?limit|too many/i.test(message)) return new RateLimitError();
  if (/permission|unauthori[sz]ed|forbidden|access/i.test(message)) return new AuthorizationError();
  if (/validation|invalid|required|missing/i.test(message)) return new ValidationError(message);
  if (/payment|razorpay|gateway|signature|refund/i.test(message)) return new PaymentError(fallback, status);
  if (/deadline|timeout|network|fetch|unavailable/i.test(message)) return new NetworkError();
  if (/firebase|firestore|permission-denied/i.test(message)) return new FirestoreError();
  return new UnknownError(fallback);
}
