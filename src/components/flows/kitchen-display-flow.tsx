"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Maximize2, Printer, Timer, UtensilsCrossed } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TableOrder, TableOrderStatus } from "@/lib/types";

const nextStatus: Record<TableOrderStatus, TableOrderStatus> = {
  new: "preparing",
  occupied: "preparing",
  preparing: "ready",
  ready: "served",
  served: "completed",
  completed: "completed",
  billed: "completed",
};

const kitchenColumns: Array<{ id: string; title: string; statuses: TableOrderStatus[]; action: string }> = [
  { id: "received", title: "Received", statuses: ["new", "occupied"], action: "Accept" },
  { id: "preparing", title: "Preparing", statuses: ["preparing"], action: "Ready" },
  { id: "ready", title: "Ready", statuses: ["ready"], action: "Delivered" },
  { id: "delivered", title: "Delivered", statuses: ["served", "completed"], action: "Complete" },
];

export function KitchenDisplayFlow() {
  const [fullscreen, setFullscreen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [tableOrders, setTableOrders] = useState<TableOrder[]>([]);
  const [connectionState, setConnectionState] = useState<"repository" | "error" | "loading">("loading");
  const orders = tableOrders;
  const sortedOrders = useMemo(
    () =>
      orders.slice().sort((a, b) => {
        const priority = (b.priority === "rush" ? 1 : 0) - (a.priority === "rush" ? 1 : 0);
        return priority || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [orders],
  );
  const visibleOrders = sortedOrders;
  const kitchenStats = useMemo(() => {
    const completed = tableOrders.filter((order) => ["served", "completed", "billed"].includes(order.status)).length;
    const delayed = visibleOrders.filter((order) => !["served", "completed", "billed"].includes(order.status) && now && now - new Date(order.createdAt).getTime() > (order.etaMinutes ?? 20) * 60000).length;
    return {
      pending: visibleOrders.filter((order) => ["new", "occupied"].includes(order.status)).length,
      preparing: visibleOrders.filter((order) => order.status === "preparing").length,
      ready: visibleOrders.filter((order) => order.status === "ready").length,
      delivered: completed,
      averagePrep: tableOrders.length ? Math.round(tableOrders.reduce((sum, order) => sum + (order.etaMinutes ?? 20), 0) / tableOrders.length) : 0,
      delayed,
      priority: visibleOrders.filter((order) => order.priority === "rush").length,
    };
  }, [now, tableOrders, visibleOrders]);

  useEffect(() => {
    window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/owner/kitchen", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { data?: TableOrder[] }) => {
        if (!active) return;
        setTableOrders(payload.data ?? []);
        setConnectionState("repository");
      })
      .catch(() => {
        if (active) setConnectionState("error");
      });
    return () => { active = false; };
  }, []);

  async function changeKitchenTicketStatus(orderId: string, status: TableOrderStatus) {
    const response = await fetch("/api/owner/kitchen", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: orderId, status: status === "occupied" || status === "billed" ? "completed" : status }),
    });
    if (!response.ok) {
      setConnectionState("error");
      return;
    }
    const payload = await response.json() as { data?: TableOrder };
    setTableOrders((current) => current.map((order) => order.id === orderId ? payload.data ?? { ...order, status } : order));
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 overflow-auto bg-background p-4" : "space-y-6"}>
      <SectionHeader
        title="Kitchen Operations Center"
        description="Live order board for received, preparing, ready, and delivered kitchen work."
        action={
          <div className="flex flex-wrap gap-2">
            <Badge variant={connectionState === "repository" ? "success" : connectionState === "error" ? "warning" : "muted"}>
              {connectionState === "repository" ? "Repository API" : connectionState === "error" ? "Sync error" : "Loading"}
            </Badge>
            <Button variant="outline" onClick={() => setFullscreen((value) => !value)}><Maximize2 className="size-4" />{fullscreen ? "Exit" : "Full screen"}</Button>
          </div>
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <KitchenMetric label="Pending" value={kitchenStats.pending} />
        <KitchenMetric label="Preparing" value={kitchenStats.preparing} />
        <KitchenMetric label="Ready" value={kitchenStats.ready} />
        <KitchenMetric label="Completed" value={kitchenStats.delivered} />
        <KitchenMetric label="Avg prep" value={`${kitchenStats.averagePrep}m`} />
        <KitchenMetric label="Delayed" value={kitchenStats.delayed} danger={kitchenStats.delayed > 0} />
        <KitchenMetric label="Priority" value={kitchenStats.priority} danger={kitchenStats.priority > 0} />
      </section>
      <section className="overflow-x-auto">
        <div className="grid min-w-[1120px] grid-cols-4 gap-4">
          {kitchenColumns.map((column) => {
            const columnOrders = visibleOrders.filter((order) => column.statuses.includes(order.status));
            return (
              <div key={column.id} className="max-h-[calc(100vh-260px)] overflow-y-auto rounded-xl border bg-muted/30">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card p-3">
                  <h2 className="font-black">{column.title}</h2>
                  <Badge variant="muted">{columnOrders.length}</Badge>
                </div>
                <div className="grid gap-3 p-3">
                  {columnOrders.map((order) => (
                    <KitchenOrderCard
                      key={order.id}
                      order={order}
                      now={now}
                      action={column.action}
                      onNext={() => changeKitchenTicketStatus(order.id, nextStatus[order.status])}
                      done={order.status === "completed" || order.status === "billed"}
                    />
                  ))}
                  {!columnOrders.length ? <p className="rounded-lg border border-dashed bg-card p-6 text-center text-sm font-semibold text-muted-foreground">No orders</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function KitchenMetric({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">{label}</p>
          <p className={danger ? "mt-1 text-2xl font-black text-destructive" : "mt-1 text-2xl font-black"}>{value}</p>
        </div>
        {danger ? <Timer className="size-5 text-destructive" /> : <CheckCircle2 className="size-5 text-primary" />}
      </CardContent>
    </Card>
  );
}

function KitchenOrderCard({
  order,
  now,
  action,
  onNext,
  done,
}: {
  order: TableOrder;
  now: number | null;
  action: string;
  onNext: () => void;
  done?: boolean;
}) {
  const ageMinutes = now ? Math.max(1, Math.round((now - new Date(order.createdAt).getTime()) / 60000)) : null;
  const delayed = Boolean(ageMinutes && ageMinutes > (order.etaMinutes ?? 20));
  return (
    <Card className={delayed ? "border-destructive" : "border-border"}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xl font-black">{order.tableNumber}</p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">{order.id} · {order.source}</p>
          </div>
          <Badge variant={order.priority === "rush" ? "destructive" : delayed ? "warning" : "muted"}>{order.priority === "rush" ? "Priority" : order.status}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm font-black">
          <Clock className="size-4 text-warning" />
          {ageMinutes ? `${ageMinutes} min` : "Syncing"} · ETA {order.etaMinutes ?? 20}m
        </div>
        <div className="space-y-2">
          {order.lines.map((line) => (
            <div key={line.itemId} className="rounded-md bg-muted p-3">
              <p className="font-black">{line.quantity}x {line.name}</p>
              {line.modifiers?.length ? <p className="mt-1 text-xs font-bold text-primary">{line.modifiers.join(", ")}</p> : null}
              {line.allergyNote ? <p className="mt-1 text-xs font-bold text-destructive">Allergy: {line.allergyNote}</p> : null}
            </div>
          ))}
        </div>
        {order.deliveryAddress ? <p className="rounded-md border p-2 text-xs font-semibold text-muted-foreground">Delivery: {order.deliveryAddress}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            KOT
          </Button>
          <Button onClick={onNext} disabled={done}>
            <UtensilsCrossed className="size-4" />
            {done ? "Completed" : action}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
