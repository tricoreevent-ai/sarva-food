"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SidebarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1" aria-label="Dashboard navigation">
      {items.map((item) => {
        const isRootSection = item.href === "/" || item.href === "/owner" || item.href === "/admin";
        const active = isRootSection
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground transition active:scale-[0.99] hover:bg-muted hover:text-foreground",
              active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardSidebar({
  items,
}: {
  appName: string;
  items: NavItem[];
  homeHref?: string;
}) {
  return (
    <aside className="sticky top-[88px] hidden h-[calc(100vh-88px)] w-64 shrink-0 border-r bg-card/92 p-4 backdrop-blur-xl lg:block">
      <SidebarLinks items={items} />
    </aside>
  );
}
