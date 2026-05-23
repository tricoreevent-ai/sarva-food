import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/firebase";

const routeRoles: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/owner", roles: ["owner", "manager", "cashier", "chef", "waiter", "accountant", "inventory-manager"] },
  { prefix: "/delivery", roles: ["delivery", "delivery-staff"] },
  { prefix: "/pos", roles: ["cashier", "owner", "manager", "waiter"] },
  { prefix: "/studio", roles: ["owner", "manager"] },
];

export function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE !== "true") {
    return NextResponse.next();
  }

  if (
    request.nextUrl.pathname === "/admin/login" ||
    request.nextUrl.pathname === "/owner/login" ||
    request.nextUrl.pathname === "/portal/login"
  ) {
    return NextResponse.next();
  }

  const matched = routeRoles.find((route) => request.nextUrl.pathname.startsWith(route.prefix));
  if (!matched) return NextResponse.next();

  const role = request.cookies.get("sarva_role")?.value as UserRole | undefined;
  if (role && matched.roles.includes(role)) {
    return NextResponse.next();
  }

  const loginUrl = new URL(matched.prefix === "/admin" ? "/admin/login" : "/owner/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/delivery/:path*", "/pos/:path*", "/studio/:path*"],
};
