"use client";

import { MapPinned, Navigation, Timer, Truck } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";
import type { DeliveryStatus } from "@/lib/types";

const nextStatus: Record<DeliveryStatus, DeliveryStatus> = {
  assigned: "accepted",
  accepted: "picked-up",
  rejected: "assigned",
  "picked-up": "on-the-way",
  "on-the-way": "delivered",
  delivered: "delivered",
  failed: "assigned",
};

export function DeliveryManagementFlow() {
  const deliveries = useAppStore((state) => state.deliveries);
  const updateDeliveryStatus = useAppStore((state) => state.updateDeliveryStatus);
  const active = deliveries.filter((item) => item.status !== "delivered");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Delivery mobile mode"
        description="Assigned orders, route hooks, ETA, accept/reject, navigation, and delivery status updates."
        action={<Badge variant="success">{active.length} active</Badge>}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        {active.map((delivery) => (
          <Card key={delivery.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">{delivery.orderId}</h2>
                  <p className="text-sm text-muted-foreground">{delivery.pickup} to {delivery.drop}</p>
                </div>
                <Badge variant={delivery.status === "failed" ? "destructive" : "warning"}>{delivery.status}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Mini icon={<Timer className="size-4" />} label="ETA" value={delivery.eta} />
                <Mini icon={<Truck className="size-4" />} label="Distance" value={`${delivery.distanceKm ?? 4.2} km`} />
                <Mini icon={<MapPinned className="size-4" />} label="Route" value={delivery.routeHook ?? "optimization-ready"} />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button onClick={() => updateDeliveryStatus(delivery.id, nextStatus[delivery.status])}>
                  <Navigation className="size-4" />
                  Mark {nextStatus[delivery.status]}
                </Button>
                <Button variant="outline" onClick={() => updateDeliveryStatus(delivery.id, "rejected")}>Reject</Button>
                <Button variant="outline" onClick={() => updateDeliveryStatus(delivery.id, "failed")}>Failed</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-md border p-3 text-sm">{icon}<p className="mt-2 font-bold">{label}</p><p className="text-muted-foreground">{value}</p></div>;
}
