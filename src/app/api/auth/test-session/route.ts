import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_BRANCH_ID, DEFAULT_TENANT_ID } from "@/lib/tenant";
import type { UserRole } from "@/types/firebase";

const allowedRoles: UserRole[] = [
  "customer",
  "owner",
  "manager",
  "cashier",
  "chef",
  "waiter",
  "accountant",
  "inventory-manager",
  "delivery-staff",
  "admin",
  "super_admin",
];

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 5,
};

export async function POST(request: NextRequest) {
  const devLoginEnabled =
    process.env.NODE_ENV !== "production" &&
    (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true" ||
      process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN === "true");

  if (!devLoginEnabled) {
    return NextResponse.json({ error: "Development login is disabled." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { uid?: string; role?: UserRole };
  const role = body.role;

  if (!body.uid || !role || !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid test session." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set("sarva_uid", body.uid, cookieOptions);
  response.cookies.set("sarva_role", role, cookieOptions);
  if (role !== "admin" && role !== "customer") {
    response.cookies.set("sarva_tenant", DEFAULT_TENANT_ID, cookieOptions);
    response.cookies.set("sarva_tenants", DEFAULT_TENANT_ID, cookieOptions);
    response.cookies.set("sarva_branch_ids", DEFAULT_BRANCH_ID, cookieOptions);
    response.cookies.set("sarva_restaurants", DEFAULT_TENANT_ID, cookieOptions);
  } else {
    response.cookies.delete("sarva_tenant");
    response.cookies.delete("sarva_tenants");
    response.cookies.delete("sarva_branch_ids");
    response.cookies.delete("sarva_restaurants");
  }
  return response;
}
