"use client";

import Link from "next/link";
import { Bell, CalendarDays, ChevronDown, Radio, Volume2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";

export function OwnerTopbar({
  ownerName,
  branchName,
  liveOrders,
}: {
  ownerName: string;
  branchName: string;
  liveOrders: number;
}) {
  const today = useMemo(() => new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), []);

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight text-neutral-950">Good morning, {ownerName}! 👋</h1>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.16)]" />
            Online
          </span>
        </div>
        <p className="mt-2 text-base font-medium text-slate-600">Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
          {branchName}
          <ChevronDown className="size-4" />
        </button>
        <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
          <CalendarDays className="size-4" />
          {today}
        </button>
        <Button variant="outline" size="icon" aria-label={`${liveOrders} live orders`}>
          <Radio className="size-5 text-emerald-600" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell className="size-5" />
        </Button>
        <Button variant="outline" size="icon" aria-label="Sound alerts" asChild>
          <Link href="/owner/settings">
            <Volume2 className="size-5" />
          </Link>
        </Button>
        <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-orange-300 text-sm font-black text-white shadow-sm">
          {ownerName.slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
