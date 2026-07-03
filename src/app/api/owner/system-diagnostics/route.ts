import { NextResponse, type NextRequest } from "next/server";
import { adminApp } from "@/firebase/admin";
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });

  try {
    const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
    const [orders, customers, loyalty, offers, menu, tables, staff, kitchen] = await Promise.all([
      new OrderRepository().summary(scope), new CustomerRepository().list(scope), new LoyaltyRepository().list(scope),
      new OfferRepository().list(scope), new MenuRepository().list(scope), new TableRepository().list(scope), new StaffRepository().list(scope), new KitchenRepository().list(scope),
    ]);
    return NextResponse.json({
      data: {
        restaurant: scope.tenantId,
        tenant: scope.tenantId,
        firebaseProject: adminApp().options.projectId ?? "not configured",
        environment: process.env.NODE_ENV,
        buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION ?? "0.1.0",
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
        revenue: orders.revenue,
      },
    });
  } catch (error) {
    console.error("[owner/system-diagnostics] load failed", { requestId: crypto.randomUUID(), reason: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ error: "Unable to load system diagnostics." }, { status: 400 });
  }
}
