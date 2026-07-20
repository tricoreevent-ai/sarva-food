import { NextResponse, type NextRequest } from "next/server";
import { KitchenRepository } from "@/repositories/kitchen-repository";
import { tenantScope } from "@/repositories/shared";
import { requireOwnerFeature } from "@/lib/server/owner-api-access";
import { operationKey as makeOperationKey } from "@/lib/server/operation-idempotency";
import { logOperationalEvent, logOperationalFailure } from "@/lib/server/operational-logging";
import { AuditRepository } from "@/repositories/audit-repository";
import { kitchenDocToTableOrder } from "@/lib/operational-api-mappers";
import { createTraceContext, extendTrace, publicTraceMeta, traceDurationMs, traceLogFields } from "@/lib/server/request-trace";
import type { KitchenOrderStatus } from "@/types/firebase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const statuses = new Set<KitchenOrderStatus>(["new", "accepted", "preparing", "ready", "cancelled"]);

export async function GET(request: NextRequest) {
  let trace = createTraceContext(request);
  try {
    const access = await requireOwnerFeature(request, "kitchen", "read");
    if (access.error) return access.error;
    const scope = tenantScope(access.session, request.nextUrl.searchParams.get("restaurantId"));
    trace = extendTrace(trace, { tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid });
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 200);
    const data = await new KitchenRepository().list(scope, {
      from: startDate(request.nextUrl.searchParams.get("from")),
      to: endDate(request.nextUrl.searchParams.get("to")),
      limit: Number.isFinite(limit) ? limit : 200,
    });
    return NextResponse.json({ data: data.map(kitchenDocToTableOrder), count: data.length });
  } catch (error) {
    logKitchenError("list", error, traceLogFields(trace), traceDurationMs(trace));
    return NextResponse.json({ error: "Kitchen orders could not be loaded.", requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let trace = createTraceContext(request);
  let context: Record<string, unknown> = { ...traceLogFields(trace), action: "create" };
  try {
    const access = await requireOwnerFeature(request, "kitchen", "create");
    if (access.error) return access.error;
    const body = await request.json().catch(() => ({}));
    const scope = tenantScope(access.session, body.restaurantId);
    trace = extendTrace(trace, { tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid });
    const opKey = cleanOperationKey(body.operationKey) ?? makeOperationKey([scope.tenantId, "kitchen-create", body.id, body.parentKitchenOrderId, body.tableNumber, body.source, body.lines, body.total]);
    context = { ...traceLogFields(trace), action: "create", kitchenOrderId: body.id, role: access.session.role };
    const data = await new KitchenRepository().create(scope, { ...body, operationKey: opKey });
    logOperationalEvent("owner.kitchen.post", { ...context, outcome: "ok", durationMs: traceDurationMs(trace), kitchenOrderId: data.id, status: data.status });
    return NextResponse.json({ data: kitchenDocToTableOrder(data) });
  } catch (error) {
    logKitchenError("create", error, context, traceDurationMs(trace));
    return NextResponse.json({ error: "Kitchen ticket could not be created.", requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let trace = createTraceContext(request);
  let context: Record<string, unknown> = { ...traceLogFields(trace), action: "update" };
  const fail = (error: string, status = 400) => NextResponse.json({ error, requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status });
  try {
    const access = await requireOwnerFeature(request, "kitchen", "update");
    if (access.error) return access.error;
    const body = await request.json().catch(() => ({})) as { id?: string; status?: KitchenOrderStatus; restaurantId?: string; operationKey?: string };
    if (!body.id) return fail("Kitchen order id is required.");
    if (body.status && !statuses.has(body.status)) return fail("Invalid kitchen status.");
    const scope = tenantScope(access.session, body.restaurantId);
    trace = extendTrace(trace, { tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid });
    const opKey = cleanOperationKey(body.operationKey) ?? makeOperationKey([scope.tenantId, "kitchen-update", body.id, body.status, Object.entries(body).filter(([key]) => key !== "operationKey").sort()]);
    context = { ...traceLogFields(trace), action: "update", kitchenOrderId: body.id, status: body.status, role: access.session.role };
    const data = await new KitchenRepository().update(scope, body.id, { ...body, operationKey: opKey }).catch((error) => {
      if (error instanceof Error && /Invalid kitchen status transition/i.test(error.message)) {
        return fail("That kitchen status cannot be applied from the current state.", 409);
      }
      if (error instanceof Error && /Full payment is required before completing/i.test(error.message)) {
        return fail("Cannot complete order while payment is pending.", 409);
      }
      if (error instanceof Error && /Invalid order status transition/i.test(error.message)) {
        return fail("The linked order is not ready for that kitchen state.", 409);
      }
      if (error instanceof Error && /cannot be cancelled without refund/i.test(error.message)) {
        return fail("Paid or payment-started orders require a refund before cancellation.", 409);
      }
      throw error;
    });
    if (data instanceof NextResponse) return data;
    if (!("unchanged" in data)) {
      await new AuditRepository().record({ tenantId: scope.tenantId, restaurantId: scope.tenantId, userId: access.session.uid, role: access.session.role, action: "kitchen_status", module: "kitchen", entityId: body.id, after: body });
    }
    logOperationalEvent("owner.kitchen.patch", { ...context, outcome: "ok", durationMs: traceDurationMs(trace) });
    return NextResponse.json({ data: kitchenDocToTableOrder(data) });
  } catch (error) {
    logKitchenError("update", error, context, traceDurationMs(trace));
    return NextResponse.json({ error: "Kitchen ticket could not be updated.", requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status: 500 });
  }
}

function cleanOperationKey(value: unknown) {
  const key = String(value ?? "").replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 120);
  return key || undefined;
}

function logKitchenError(action: string, error: unknown, context: Record<string, unknown> = {}, durationMs = 0) {
  logOperationalFailure(`owner.kitchen.${action}`, error, { ...context, durationMs });
}

function startDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function endDate(value: string | null) {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isFinite(date.getTime()) ? date : undefined;
}
