"use client";

import { useEffect, useMemo, useState } from "react";
import { Maximize2, Timer, UtensilsCrossed } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";
import { DEFAULT_BRANCH_ID, DEFAULT_RESTAURANT_ID } from "@/lib/tenant";
import { listenKitchenOrders } from "@/services/restaurant-ops-service";
import type { TableOrderStatus } from "@/lib/types";

const nextStatus: Record<TableOrderStatus, TableOrderStatus> = {
  new: "preparing",
  occupied: "preparing",
  preparing: "ready",
  ready: "served",
  served: "completed",
  completed: "completed",
  billed: "completed",
};

export function KitchenDisplayFlow() {
  const [fullscreen, setFullscreen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const authUser = useAppStore((state) => state.authUser);
  const branch = useAppStore((state) => state.branches[0]);
  const localTableOrders = useAppStore((state) => state.tableOrders);
  const updateTableOrderStatus = useAppStore((state) => state.updateTableOrderStatus);
  const [realtimeOrders, setRealtimeOrders] = useState<typeof localTableOrders | null>(null);
  const [connectionState, setConnectionState] = useState<"local" | "live" | "error">("local");
  const tableOrders = realtimeOrders ?? localTableOrders;
  const orders = useMemo(
    () => tableOrders.filter((order) => !["completed", "billed"].includes(order.status)),
    [tableOrders],
  );
  const sortedOrders = useMemo(
    () =>
      orders.slice().sort((a, b) => {
        const priority = (b.priority === "rush" ? 1 : 0) - (a.priority === "rush" ? 1 : 0);
        return priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [orders],
  );

  useEffect(() => {
    window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return listenKitchenOrders(
      authUser.restaurantSlug ?? DEFAULT_RESTAURANT_ID,
      branch?.id ?? DEFAULT_BRANCH_ID,
      (nextOrders) => {
        setRealtimeOrders(nextOrders);
        setConnectionState("live");
      },
      () => {
        setConnectionState("error");
      },
    );
  }, [authUser.restaurantSlug, branch?.id]);

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 overflow-auto bg-background p-4" : "space-y-6"}>
      <SectionHeader
        title="Kitchen display system"
        description="Live incoming orders, timers, priority sorting, and touch status updates for kitchen screens."
        action={
          <div className="flex flex-wrap gap-2">
            <Badge variant={connectionState === "live" ? "success" : connectionState === "error" ? "warning" : "muted"}>
              {connectionState === "live" ? "Firestore live" : connectionState === "error" ? "Local fallback" : "Local queue"}
            </Badge>
            <Button variant="outline" onClick={() => setFullscreen((value) => !value)}><Maximize2 className="size-4" />{fullscreen ? "Exit" : "Full screen"}</Button>
          </div>
        }
      />
      <section className="grid gap-4 xl:grid-cols-3">
        {sortedOrders
          .map((order) => {
            const ageMinutes = now ? Math.max(1, Math.round((now - new Date(order.createdAt).getTime()) / 60000)) : null;
            return (
            <Card key={order.id} className="border-2">
              <CardContent className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-3xl font-black">{order.tableNumber}</p>
                    <p className="mt-1 text-sm font-bold text-muted-foreground">{order.id} · {order.source}</p>
                  </div>
                  <Badge variant={order.priority === "rush" ? "destructive" : "muted"}>{order.priority}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xl font-black">
                  <Timer className="size-6 text-warning" />
                  {ageMinutes ? `${ageMinutes} min live` : "Timer syncing"} · ETA {order.etaMinutes}
                </div>
                <div className="space-y-3">
                  {order.lines.map((line) => (
                    <div key={line.itemId} className="rounded-md bg-muted p-3">
                      <p className="text-xl font-black">{line.quantity}x {line.name}</p>
                      {line.modifiers?.length ? <p className="mt-1 text-sm font-bold text-primary">{line.modifiers.join(", ")}</p> : null}
                      {line.allergyNote ? <p className="mt-1 text-sm font-bold text-destructive">Allergy: {line.allergyNote}</p> : null}
                    </div>
                  ))}
                </div>
                {order.deliveryAddress ? (
                  <p className="rounded-md border p-3 text-sm font-semibold text-muted-foreground">
                    Delivery: {order.deliveryAddress}
                  </p>
                ) : null}
                {order.scheduledFor ? (
                  <p className="rounded-md border p-3 text-sm font-semibold text-muted-foreground">
                    Scheduled: {new Date(order.scheduledFor).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                ) : null}
                <Button className="h-16 w-full text-lg" onClick={() => updateTableOrderStatus(order.id, nextStatus[order.status])}>
                  <UtensilsCrossed className="size-5" />
                  Mark {nextStatus[order.status]}
                </Button>
                <Badge variant={order.status === "ready" ? "success" : order.status === "preparing" ? "warning" : "default"}>
                  {order.status}
                </Badge>
              </CardContent>
            </Card>
          )})}
        {!sortedOrders.length ? (
          <Card className="xl:col-span-3">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">No live kitchen tickets.</CardContent>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
