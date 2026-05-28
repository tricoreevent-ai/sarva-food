import { NextResponse, type NextRequest } from "next/server";

const ownerRoles = new Set(["owner", "manager", "cashier", "waiter", "chef", "kitchen-manager", "accountant", "inventory-manager", "delivery-staff", "delivery"]);
const adminRoles = new Set(["admin", "super_admin"]);
const protectedCustomerPrefixes = ["/account", "/profile", "/orders", "/wallet", "/addresses", "/favorites"];
const publicSystemPrefixes = ["/api", "/_next", "/icons", "/images", "/favicon", "/manifest", "/sw.js"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (publicSystemPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const role = request.cookies.get("sarva_role")?.value;
  const isOwner = Boolean(role && ownerRoles.has(role));
  const isAdmin = Boolean(role && adminRoles.has(role));
  const isCustomer = role === "customer";

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (isAdmin) return NextResponse.next();
    return redirectTo(request, isOwner ? "/owner" : `/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  if ((pathname.startsWith("/owner") || pathname.startsWith("/pos")) && !pathname.startsWith("/owner/login")) {
    if (isOwner) return NextResponse.next();
    if (isAdmin) return redirectTo(request, "/admin");
    return redirectTo(request, `/owner/login?next=${encodeURIComponent(pathname)}`);
  }

  if (protectedCustomerPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    if (isCustomer) return NextResponse.next();
    if (isOwner) return redirectTo(request, "/owner");
    if (isAdmin) return redirectTo(request, "/admin");
    return redirectTo(request, `/login?redirect=${encodeURIComponent(pathname)}`);
  }

  if ((isOwner || isAdmin) && isCustomerSurface(pathname)) {
    return redirectTo(request, isAdmin ? "/admin" : "/owner");
  }

  return NextResponse.next();
}

function isCustomerSurface(pathname: string) {
  if (pathname === "/" || pathname.startsWith("/restaurants") || pathname.startsWith("/restaurant/")) return true;
  return ["/offers", "/schedule", "/cart", "/checkout", "/track-order", "/login", "/signup", "/forgot-password", "/terms", "/privacy", "/refund-policy", "/cancellation-policy", "/cookie-policy", "/delivery-policy", "/help", "/register-restaurant"].some((prefix) => pathname.startsWith(prefix));
}

function redirectTo(request: NextRequest, destination: string) {
  return NextResponse.redirect(new URL(destination, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
