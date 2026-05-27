"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PublicHeader } from "@/components/layout/public-header";
import { CustomerAuthProvider } from "@/context/auth/customer-auth-provider";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ResponsibilityDisclaimer } from "@/components/legal/responsibility-disclaimer";
import { FloatingCartBar, MobileOfflineBanner, MobilePullToRefresh } from "@/components/mobile/mobile-experience";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { customerNav } from "@/lib/navigation";

export function CustomerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showFloatingCart =
    !pathname.startsWith("/restaurant/") &&
    !["/checkout", "/cart", "/order-success", "/profile"].some((path) => pathname.startsWith(path));
  const homeRoute = pathname === "/";

  return (
    <div className="customer-theme customer-light min-h-screen pb-32 md:pb-0">
      <CustomerAuthProvider>
        <MobileOfflineBanner />
        <MobilePullToRefresh>
          <div className={homeRoute ? "hidden md:block" : undefined}>
            <PublicHeader />
          </div>
          {children}
        </MobilePullToRefresh>
        <ResponsibilityDisclaimer surface="footer" />
        <InstallPrompt />
        {showFloatingCart ? <FloatingCartBar /> : null}
        <MobileBottomNav items={customerNav} />
      </CustomerAuthProvider>
    </div>
  );
}
