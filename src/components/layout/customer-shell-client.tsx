"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileOfflineBanner, MobilePullToRefresh } from "@/components/mobile/mobile-shell-experience";
import { CustomerAuthProvider } from "@/context/auth/customer-auth-provider";
import { CustomerFooter } from "@/components/layout/customer-footer";
import { customerNav } from "@/lib/navigation";

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
  const restaurantRoute = pathname.startsWith("/restaurant/");
  const showFloatingCart =
    !restaurantRoute &&
    !["/checkout", "/cart", "/order-success", "/profile"].some((path) => pathname.startsWith(path));
  const homeRoute = pathname === "/";

  return (
    <CustomerAuthProvider>
      <MobileOfflineBanner />
      <MobilePullToRefresh>
        <div className={homeRoute ? "hidden md:block" : undefined}>
          <PublicHeader />
        </div>
        {children}
      </MobilePullToRefresh>
      {restaurantRoute ? null : <CustomerFooter />}
      <InstallPrompt />
      {showFloatingCart ? <CustomerFloatingCartBar /> : null}
      <MobileBottomNav items={customerNav} />
    </CustomerAuthProvider>
  );
}
