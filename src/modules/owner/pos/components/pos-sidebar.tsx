"use client";

import Link from "next/link";
import { CircleHelp, ClipboardList, Clock, LogOut, ReceiptText, Settings, UserSearch, Utensils, type LucideIcon } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type PosPanel = "new" | "active" | "held" | "past" | "customers";

type PosSidebarProps = {
  activePanel: PosPanel;
  activeOrders: number;
  kotTickets: number;
  heldOrders: number;
  showKitchenQueue?: boolean;
  onNewOrder: () => void;
  onActiveOrders: () => void;
  onHeldOrders: () => void;
  onPastOrders: () => void;
  onCustomers: () => void;
};

export function PosSidebar({
  activePanel,
  activeOrders,
  kotTickets,
  heldOrders,
  showKitchenQueue = true,
  onNewOrder,
  onActiveOrders,
  onHeldOrders,
  onPastOrders,
  onCustomers,
}: PosSidebarProps) {
  const productName = useAppStore((state) => state.cmsSettings.appName?.trim() || APP_NAME);
  const initials = productName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "SF";

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <Link href="/owner" className="flex h-20 items-center gap-3 border-b border-slate-100 px-5 transition hover:bg-slate-50" aria-label="Go to owner dashboard">
        <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-sm font-black text-white">{initials}</span>
        <div>
          <p className="font-black text-slate-950">{productName}</p>
          <p className="text-sm font-medium text-slate-500">POS</p>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="POS navigation">
        <button
          type="button"
          onClick={onNewOrder}
          className={cn(
            "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50",
            activePanel === "new" && "bg-emerald-50 text-emerald-700",
          )}
        >
          <ReceiptText className="size-5" />
          <span className="flex-1 text-left">New Order</span>
        </button>
        <NavButton active={activePanel === "active"} label="Active Orders" icon={ClipboardList} badge={activeOrders} onClick={onActiveOrders} />
        <NavButton active={activePanel === "held"} label="Hold Orders" icon={Clock} badge={heldOrders} onClick={onHeldOrders} />
        <NavButton active={activePanel === "past"} label="Order History" icon={ReceiptText} onClick={onPastOrders} />
        <NavButton active={activePanel === "customers"} label="Customers" icon={UserSearch} onClick={onCustomers} />
        {showKitchenQueue ? (
          <Link
            href="/owner/kitchen"
            className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Utensils className="size-5" />
            <span className="flex-1">Kitchen Queue</span>
            {kotTickets ? <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-white">{kotTickets}</span> : null}
          </Link>
        ) : null}
        <Link
          href="/owner/settings"
          className="flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <Settings className="size-5" />
          <span className="flex-1">Settings</span>
        </Link>
      </nav>
      <div className="space-y-2 border-t border-slate-100 p-4">
        <Link href="/owner/settings?tab=profile" className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
          <CircleHelp className="size-5" />
          Help & Support
        </Link>
        <Link href="/owner/login" className="flex h-11 items-center gap-3 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-600 hover:bg-red-50">
          <LogOut className="size-5" />
          Logout
        </Link>
      </div>
    </aside>
  );
}

function NavButton({
  active,
  label,
  icon: Icon,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: LucideIcon;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50",
        active && "bg-emerald-50 text-emerald-700",
      )}
    >
      <Icon className="size-5" />
      <span className="flex-1 text-left">{label}</span>
      {badge ? <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-white">{badge}</span> : null}
    </button>
  );
}
