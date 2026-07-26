import { NextResponse, type NextRequest } from "next/server";
import { adminApp, adminDb } from "@/firebase/admin";
import { COLLECTIONS } from "@/firebase/collections";
import { CustomerRepository } from "@/repositories/customer-repository";
import { KitchenRepository } from "@/repositories/kitchen-repository";
import { LoyaltyRepository } from "@/repositories/loyalty-repository";
import { MenuRepository } from "@/repositories/menu-repository";
import { OfferRepository } from "@/repositories/offer-repository";
import { OrderRepository } from "@/repositories/order-repository";
import { StaffRepository } from "@/repositories/staff-repository";
import { TableRepository } from "@/repositories/table-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";
import { getSessionFromRequest } from "@/lib/server-auth";
import { getBuildCommit } from "@/lib/server/build-info";
import { RELEASE_VERSION } from "@/lib/release";
import { logOperationalFailure } from "@/lib/server/operational-logging";
import { buildHealthSnapshot, getOperationalDiagnostics } from "@/lib/server/production-health";
import { getProductionMonitoringSnapshot } from "@/lib/server/production-monitoring";
import { createTraceContext, extendTrace, publicTraceMeta, traceDurationMs, traceLogFields } from "@/lib/server/request-trace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let trace = createTraceContext(request);
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required.", requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status: 403 });
  trace = extendTrace(trace, { userId: session.uid });

  try {
    const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
    trace = extendTrace(trace, { tenantId: scope.tenantId, restaurantId: scope.tenantId });
    const [orders, customers, loyalty, offers, menu, tables, staff, kitchen, notificationQueueCount] = await Promise.all([
      new OrderRepository().summary(scope), new CustomerRepository().list(scope), new LoyaltyRepository().list(scope),
      new OfferRepository().list(scope), new MenuRepository().list(scope), new TableRepository().list(scope), new StaffRepository().list(scope), new KitchenRepository().list(scope),
      adminDb().collection(COLLECTIONS.notifications).where("tenantId", "==", scope.tenantId).where("read", "==", false).count().get().then((snapshot) => snapshot.data().count).catch(() => null),
    ]);
    const waiterLoad = orders.orders.filter((order) => ["ready", "picked-up", "served"].includes(order.status)).length;
    const operationalDiagnostics = getOperationalDiagnostics({
      tenantCount: 1,
      openOrders: orders.activeOrderCount,
      kitchenOrders: kitchen,
      posDraftCount: orders.orders.filter((order) => order.status === "draft").length,
      notificationQueueCount,
    });
    const health = await buildHealthSnapshot("ready");
    const productionMonitoring = getProductionMonitoringSnapshot({
      applicationStatus: health.status,
      applicationVersion: health.applicationVersion,
      commitSha: health.gitSha,
      deploymentEnvironment: health.deploymentEnvironment,
      nodeVersion: health.runtimeStatus.nodeVersion,
      responseTimeMs: health.durationMs,
      firestoreStatus: health.firestoreConnectivity.status,
      storageStatus: health.storageConnectivity.status,
      smtpStatus: health.smtpAvailability.status,
      cloudinaryStatus: health.cloudinaryAvailability.status,
      googleOAuthConfigured: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET),
      mapboxConfigured: Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN),
      razorpayStatus: health.razorpayConfiguration.status,
      razorpayWebhookConfigured: health.razorpayConfiguration.webhookConfigured,
      pushConfigured: health.firebaseConfiguration.vapidConfigured,
      whatsappConfigured: Boolean(process.env.WHATSAPP_CLOUD_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      smsConfigured: Boolean(process.env.SMS_PROVIDER),
      memoryUsage: health.runtimeStatus.memoryUsage,
      cpuEstimation: health.runtimeStatus.cpuEstimation,
      openOrders: orders.activeOrderCount,
      kitchenLoad: operationalDiagnostics.kitchenLoad,
      notificationQueue: notificationQueueCount,
      pendingQueue: operationalDiagnostics.pendingQueueCount,
      realtimeStatus: operationalDiagnostics.realtimeListenerCount.note,
      backgroundJobsStatus: "idle; owner route queues only",
    }, { restaurantId: scope.tenantId });

    return NextResponse.json({
      data: {
        restaurant: scope.tenantId,
        tenant: scope.tenantId,
        firebaseProject: adminApp().options.projectId ?? "not configured",
        environment: process.env.NODE_ENV,
        buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION ?? RELEASE_VERSION,
        commitSha: getBuildCommit(),
        listenerStatus: "Server repositories: healthy",
        firestoreStatus: "connected",
        ordersCount: orders.orderCount,
        customersCount: customers.length,
        offersCount: offers.length,
        menuCount: menu.length,
        tablesCount: tables.length,
        staffCount: staff.length,
        loyaltyCount: loyalty.length,
        kitchenCount: kitchen.length,
        waiterLoad,
        notificationQueueCount,
        printerStatus: "manual_check_required",
        revenue: orders.revenue,
        operationalDiagnostics,
        productionMonitoring,
        trace: publicTraceMeta(trace),
      },
    });
  } catch (error) {
    logOperationalFailure("owner.system-diagnostics.get", error, { ...traceLogFields(trace), durationMs: traceDurationMs(trace) });
    return NextResponse.json({ error: "Unable to load system diagnostics.", requestId: trace.requestId, meta: publicTraceMeta(trace) }, { status: 400 });
  }
}
