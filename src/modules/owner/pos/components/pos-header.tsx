"use client";

import { Bell, Clock, Menu, RefreshCw, Search, UserSearch } from "lucide-react";
import Link from "next/link";
import { OwnerBreadcrumbs } from "@/components/layout/owner-breadcrumbs";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { APP_NAME } from "@/lib/constants";

export function PosHeader({
  query,
  onQuery,
  pendingSync,
  notificationCount,
  profileName,
}: {
  query: string;
  onQuery: (value: string) => void;
  pendingSync: number;
  notificationCount: number;
  profileName: string;
}) {
  const productName = useAppStore((state) => state.cmsSettings.appName?.trim() || APP_NAME);

  return (
    <header className="grid gap-3 border-b border-slate-200 bg-white p-4 xl:grid-cols-[auto_1fr_auto] xl:items-center">
      <div className="xl:col-span-3">
        <OwnerBreadcrumbs />
      </div>
      <Button variant="outline" size="icon" aria-label="Open POS menu" className="lg:hidden">
        <Menu className="size-5" />
      </Button>
      <label className="relative block">
        <Search className="absolute left-4 top-3.5 size-4 text-slate-400" />
        <input
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search menu items, dishes or SKU"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
        <Button
          variant="outline"
          className="h-11"
          title="Open past orders"
          onClick={() => window.dispatchEvent(new CustomEvent("sarva-pos-open-past-orders"))}
        >
          <Clock className="size-4" />
          Recent orders
        </Button>
        <Button
          variant="outline"
          className="h-11"
          title="Open customer lookup"
          onClick={() => window.dispatchEvent(new CustomEvent("sarva-pos-open-customers"))}
        >
          <UserSearch className="size-4" />
          Customer lookup
        </Button>
        <Button variant="outline" className="h-11">
          <span className="size-2 rounded-full bg-emerald-500" />
          Online
        </Button>
        <Button variant="outline" className="h-11" onClick={() => window.dispatchEvent(new CustomEvent("sarva-open-sync-center"))}>
          <RefreshCw className="size-4" />
          Sync
          {pendingSync ? <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">{pendingSync}</span> : null}
        </Button>
        <Button variant="outline" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          {notificationCount ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-black text-white">{notificationCount}</span> : null}
        </Button>
        <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 2xl:inline-flex">{productName}</span>
        <Button variant="outline" className="h-11" asChild>
          <Link href="/owner/settings?tab=profile">
          <span className="grid size-7 place-items-center rounded-full bg-orange-500 text-xs font-black text-white">{profileName.slice(0, 1)}</span>
          <span className="text-left text-xs leading-4">
            <span className="block font-black">{profileName}</span>
            <span className="text-slate-500">Waiter</span>
          </span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
