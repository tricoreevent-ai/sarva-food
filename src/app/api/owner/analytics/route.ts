import { NextResponse, type NextRequest } from "next/server";
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
import { kitchenDocToTableOrder, menuDocToMenuItem, staffDocToStaffMember, tableDocToPosTable } from "@/lib/operational-api-mappers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request, "owner");
  if (!session || !ownerReadRoles.has(session.role)) return NextResponse.json({ error: "Owner access is required." }, { status: 403 });

  try {
    const scope = tenantScope(session, request.nextUrl.searchParams.get("restaurantId"));
    const from = parseDate(request.nextUrl.searchParams.get("from"));
    const to = parseDate(request.nextUrl.searchParams.get("to"), true);
    const [summary, customers, loyalty, offers, menu, tables, staff, kitchen] = await Promise.all([
      new OrderRepository().summary(scope, { from, to }),
      new CustomerRepository().list(scope),
      new LoyaltyRepository().list(scope),
      new OfferRepository().list(scope),
      new MenuRepository().list(scope),
      new TableRepository().list(scope),
      new StaffRepository().list(scope),
      new KitchenRepository().list(scope),
    ]);
    return NextResponse.json({
      data: {
        ...summary,
        customerCount: customers.length,
        loyaltyCount: loyalty.length,
        offerCount: offers.length,
        menuCount: menu.length,
        tableCount: tables.length,
        staffCount: staff.length,
        kitchenCount: kitchen.length,
        customers,
        loyalty,
        offers,
        menu: menu.map(menuDocToMenuItem),
        tables: tables.map(tableDocToPosTable),
        staff: staff.map(staffDocToStaffMember),
        kitchen: kitchen.map(kitchenDocToTableOrder),
      },
    });
  } catch (error) {
    console.error("[owner/analytics] load failed", { requestId: crypto.randomUUID(), reason: error instanceof Error ? error.name : typeof error });
    return NextResponse.json({ error: "Unable to load canonical analytics." }, { status: 400 });
  }
}

function parseDate(value: string | null, end = false) {
  if (!value) return undefined;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return undefined;
  if (end && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(23, 59, 59, 999);
  return date;
}
