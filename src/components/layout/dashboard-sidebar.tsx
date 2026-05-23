"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NavItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function SidebarLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1" aria-label="Dashboard navigation">
      {items.map((item) => {
        const active = item.href === "/owner"
          ? pathname === "/owner"
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
  appName,
  items,
  homeHref = "/",
}: {
  appName: string;
  items: NavItem[];
  homeHref?: string;
}) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card/92 p-4 backdrop-blur-xl lg:block">
        <Link href={homeHref} className="mb-5 flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" aria-label="Go to dashboard overview">
          <span className="food-gradient grid size-10 place-items-center rounded-md text-sm font-black text-white shadow-lg">
            SF
          </span>
          <span>
            <span className="block text-sm font-black">SARVA FOOD</span>
            <span className="text-xs text-muted-foreground">{appName}</span>
          </span>
        </Link>
        <SidebarLinks items={items} />
      </aside>

      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/86 px-4 backdrop-blur-xl lg:hidden">
        <Link href={homeHref} className="flex items-center gap-2 font-black" aria-label="Go to dashboard overview">
          <span className="food-gradient grid size-9 place-items-center rounded-xl text-xs text-white shadow-sm">SF</span>
          <span className="truncate">{appName}</span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="rounded-r-3xl">
            <SheetHeader>
              <SheetTitle>{appName}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <SidebarLinks items={items} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
