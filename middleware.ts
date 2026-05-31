import { NextResponse, type NextRequest } from "next/server";

const ownerRoles = new Set(["owner", "manager", "cashier", "waiter", "chef", "kitchen-manager", "accountant", "inventory-manager", "delivery-staff", "delivery"]);
const adminRoles = new Set(["admin", "super_admin"]);
const protectedCustomerPrefixes = ["/account", "/profile", "/orders", "/wallet", "/addresses", "/favorites"];
const publicSystemPrefixes = ["/api", "/_next", "/icons", "/images", "/favicon", "/manifest", "/sw.js"];
const sessionCookies = {
  admin: "sarva_admin_role",
  owner: "sarva_owner_role",
  customer: "sarva_customer_role",
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (publicSystemPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const adminRole = request.cookies.get(sessionCookies.admin)?.value;
  const ownerRole = request.cookies.get(sessionCookies.owner)?.value;
  const customerRole = request.cookies.get(sessionCookies.customer)?.value;
  const isOwner = Boolean(ownerRole && ownerRoles.has(ownerRole));
  const isAdmin = Boolean(adminRole && adminRoles.has(adminRole));
  const isCustomer = customerRole === "customer";

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (isAdmin) return NextResponse.next();
    return redirectTo(request, `/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  if ((pathname.startsWith("/owner") || pathname.startsWith("/pos")) && !pathname.startsWith("/owner/login")) {
    if (isOwner) return NextResponse.next();
    return redirectTo(request, `/owner/login?next=${encodeURIComponent(pathname)}`);
  }

  if (protectedCustomerPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (isCustomer) return NextResponse.next();
    return redirectTo(request, `/login?redirect=${encodeURIComponent(pathname)}`);
  }

  return NextResponse.next();
}

function redirectTo(request: NextRequest, destination: string) {
  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
