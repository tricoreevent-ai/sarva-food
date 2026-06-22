"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChefHat, ChevronRight, ClipboardList, Home, LayoutTemplate, Percent, ReceiptText, Settings, Store, Table2, UtensilsCrossed, UsersRound } from "lucide-react";
import type { ElementType } from "react";
import { cn } from "@/lib/utils";

const routeMeta: Record<string, { label: string; icon: ElementType }> = {
  owner: { label: "Home", icon: Home },
  admin: { label: "Admin", icon: Home },
  orders: { label: "Orders", icon: ClipboardList },
  offers: { label: "Offers", icon: Percent },
  pos: { label: "Order Desk", icon: ReceiptText },
  kitchen: { label: "Kitchen Operations Center", icon: ChefHat },
  kds: { label: "Kitchen Operations Center", icon: ChefHat },
  menu: { label: "Menu", icon: UtensilsCrossed },
  tables: { label: "Tables", icon: Table2 },
  customers: { label: "Customers", icon: UsersRound },
  settings: { label: "Settings", icon: Settings },
  cms: { label: "System Settings", icon: LayoutTemplate },
  analytics: { label: "Analytics", icon: BarChart3 },
  inventory: { label: "Inventory", icon: Store },
};

export function OwnerBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const ownerIndex = segments[0] === "pos" ? -1 : segments.indexOf("owner");
  const normalized = segments[0] === "pos" ? ["owner", "pos", ...segments.slice(1)] : segments.slice(Math.max(ownerIndex, 0));
  const crumbs = normalized.length ? normalized : ["owner"];

  return (
    <nav aria-label="Breadcrumb" className={cn("customer-scroll -mx-1 flex max-w-full items-center gap-2 overflow-x-auto px-1 text-sm font-semibold text-slate-500", className)}>
      {crumbs.map((segment, index) => {
        const href = `/${crumbs.slice(0, index + 1).join("/")}`;
        const meta = routeMeta[segment] ?? { label: segment.replace(/-/g, " "), icon: Store };
        const Icon = meta.icon;
        const current = index === crumbs.length - 1;
        return (
          <span key={`${segment}-${index}`} className="flex shrink-0 items-center gap-2">
            {index > 0 ? <ChevronRight className="size-4 text-slate-300" /> : null}
            <Link
              href={href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 capitalize transition hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200",
                current && "text-orange-600",
              )}
            >
              <Icon className="size-4" />
              {meta.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
