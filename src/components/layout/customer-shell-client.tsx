"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogIn, LogOut, Menu, Moon, PackageOpen, Sun, X, type LucideIcon } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CustomerCartSync } from "@/components/commerce/customer-cart-sync";
import { MobileOfflineBanner, MobilePullToRefresh } from "@/components/mobile/mobile-shell-experience";
import { CustomerAuthProvider } from "@/context/auth/customer-auth-provider";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { useCartStore } from "@/lib/cart-store";
import { customerNav } from "@/lib/navigation";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import { useThemeMode } from "@/lib/theme-provider";
import { signOutStackCustomer } from "@/services/auth/stack-auth-client";
import { signOutUser } from "@/services/auth-service";
import { cn } from "@/lib/utils";
import { useState } from "react";

const CustomerFloatingCartBar = dynamic(
  () => import("@/components/mobile/floating-cart-bar").then((mod) => mod.FloatingCartBar),
  { ssr: false },
);

const InstallPrompt = dynamic(
  () => import("@/components/pwa/install-prompt").then((mod) => mod.InstallPrompt),
  { ssr: false },
);

export function CustomerShellClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const authUser = useAppStore((state) => state.authUser);
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const clearCart = useCartStore((state) => state.clearCart);
  const { theme, setTheme } = useThemeMode();
  const restaurantRoute = pathname.startsWith("/restaurant/");
  const showMobileFooter = pathname === "/";
  const showFloatingCart =
    !restaurantRoute &&
    !["/checkout", "/cart", "/order-success", "/profile"].some((path) => pathname.startsWith(path));
  const signedIn = authUser.role === "customer" && authUser.id !== "anonymous";

  async function logout() {
    await Promise.all([
      signOutUser().catch(() => undefined),
      signOutStackCustomer().catch(() => undefined),
      fetch("/api/auth/session?surface=customer", { method: "DELETE" }).catch(() => undefined),
    ]);
    clearCart();
    window.localStorage.removeItem("sarva-customer-auth");
    setAuthUser({ id: "anonymous", name: "Anonymous", role: "customer", restaurantSlug: DEFAULT_TENANT_ID });
    setMenuOpen(false);
    window.location.href = "/";
  }

  return (
    <CustomerAuthProvider>
      <CustomerCartSync />
      <MobileOfflineBanner />
      <MobilePullToRefresh>
        <div className={restaurantRoute ? "hidden xl:block" : ""}>
          <PublicHeader />
        </div>
        {children}
      </MobilePullToRefresh>
      <div className={showMobileFooter ? "" : "max-md:hidden"}>
        <CustomerFooter />
      </div>
      <InstallPrompt />
      {showFloatingCart ? <CustomerFloatingCartBar /> : null}
      {!restaurantRoute ? (
        <Button type="button" size="icon" className="fixed right-4 top-4 z-50 size-10 rounded-full bg-card/90 text-foreground shadow-xl backdrop-blur md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open app menu">
          <Menu className="size-5" />
        </Button>
      ) : null}
      {menuOpen ? (
        <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)}>
          <section className="absolute inset-x-3 bottom-3 max-h-[86vh] overflow-y-auto rounded-[1.75rem] bg-card p-4 text-card-foreground shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-primary">Nammude</p>
                <h2 className="text-xl font-black">{signedIn ? authUser.name : "Customer account"}</h2>
              </div>
              <Button type="button" size="icon" variant="ghost" className="rounded-full" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X className="size-5" />
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ThemeButton label="Light" active={theme === "light"} icon={Sun} onClick={() => setTheme("light")} />
              <ThemeButton label="Dark" active={theme === "dark"} icon={Moon} onClick={() => setTheme("dark")} />
              <ThemeButton label="System" active={theme === "system"} icon={Menu} onClick={() => setTheme("system")} />
            </div>

            <div className="mt-5 grid gap-2">
              {customerNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm font-black" onClick={() => setMenuOpen(false)}>
                    <Icon className="size-5 text-primary" />
                    {item.label}
                  </Link>
                );
              })}
              <Link href="/orders" className="flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm font-black" onClick={() => setMenuOpen(false)}>
                <PackageOpen className="size-5 text-primary" />
                Orders
              </Link>
              {signedIn ? (
                <button type="button" className="flex items-center gap-3 rounded-2xl bg-destructive/10 px-4 py-3 text-left text-sm font-black text-destructive" onClick={() => void logout()}>
                  <LogOut className="size-5" />
                  Logout
                </button>
              ) : (
                <Link href="/login" className="flex items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground" onClick={() => setMenuOpen(false)}>
                  <LogIn className="size-5" />
                  Login
                </Link>
              )}
            </div>
          </section>
        </div>
      ) : null}
      <MobileBottomNav items={customerNav} />
    </CustomerAuthProvider>
  );
}

function ThemeButton({ label, active, icon: Icon, onClick }: { label: string; active: boolean; icon: LucideIcon; onClick: () => void }) {
  return (
    <button type="button" className={cn("grid min-h-16 place-items-center rounded-2xl border px-2 text-xs font-black", active ? "border-primary bg-primary text-primary-foreground" : "bg-muted/60 text-foreground")} onClick={onClick}>
      <Icon className="mb-1 size-5" />
      {label}
    </button>
  );
}
