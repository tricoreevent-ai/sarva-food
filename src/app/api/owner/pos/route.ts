import { NextResponse, type NextRequest } from "next/server";
import { CustomerRepository } from "@/repositories/customer-repository";
import { KitchenRepository } from "@/repositories/kitchen-repository";
import { MenuRepository } from "@/repositories/menu-repository";
import { OrderRepository } from "@/repositories/order-repository";
import { StaffRepository } from "@/repositories/staff-repository";
import { TableRepository } from "@/repositories/table-repository";
import { ownerReadRoles, tenantScope } from "@/repositories/shared";
import { getSessionFromRequest } from "@/lib/server-auth";
import { customerDocToLoyaltyCustomer, kitchenDocToTableOrder, menuDocToMenuItem, orderDocToDemoOrder, staffDocToStaffMember, tableDocToPosTable } from "@/lib/operational-api-mappers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });
  const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
  const [orders, kitchen, menu, customers, tables, staff] = await Promise.all([
    new OrderRepository().list(scope, { limit: 500 }),
    new KitchenRepository().list(scope),
    new MenuRepository().list(scope),
    new CustomerRepository().list(scope),
    new TableRepository().list(scope),
    new StaffRepository().list(scope),
  ]);
  return NextResponse.json({
    data: {
      orders: orders.map(orderDocToDemoOrder),
      kitchen: kitchen.map(kitchenDocToTableOrder),
      menu: menu.map(menuDocToMenuItem),
      customers: customers.map(customerDocToLoyaltyCustomer),
      tables: tables.map(tableDocToPosTable),
      staff: staff.map(staffDocToStaffMember),
    },
    counts: { orders: orders.length, kitchen: kitchen.length, menu: menu.length, customers: customers.length, tables: tables.length, staff: staff.length },
  });
}
