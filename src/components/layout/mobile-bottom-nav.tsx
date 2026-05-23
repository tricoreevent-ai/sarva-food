"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/types";
import { useCartStore } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

export function MobileBottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const cartCount = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-40 max-w-[calc(100vw-1.5rem)] rounded-[1.25rem] border bg-card/88 px-2 py-1.5 shadow-2xl backdrop-blur-xl md:hidden safe-bottom"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.slice(0, 5).map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          const isCart = item.label === "Cart";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-black text-muted-foreground transition active:scale-95",
                active && !isCart && "text-primary",
                isCart && "-mt-8",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className={cn(
                "grid place-items-center",
                isCart ? "food-gradient size-12 rounded-full text-white shadow-2xl ring-4 ring-background" : "size-6",
              )}>
                <Icon className={isCart ? "size-6" : "size-5"} aria-hidden="true" />
              </span>
              {isCart && cartCount ? (
                <span className="absolute right-2 top-0 grid size-5 place-items-center rounded-full bg-white text-[10px] font-black text-primary shadow">
                  {cartCount}
                </span>
              ) : null}
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
