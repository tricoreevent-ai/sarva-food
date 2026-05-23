import { Bike, MapPinned, Timer, Trophy } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  { title: "Avg delivery time", value: "--", icon: Timer },
  { title: "Distance tracked", value: "--", icon: MapPinned },
  { title: "Success rate", value: "--", icon: Trophy },
  { title: "Route sync", value: "Waiting", icon: Bike },
];

export default function DeliveryReportsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Driver performance" description="Delivery timing, distance, route optimization, and live location readiness from synced delivery orders." />
      <section className="dashboard-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <Card key={metric.title}><CardContent className="p-5"><Icon className="size-6 text-primary" /><p className="mt-3 text-sm font-bold text-muted-foreground">{metric.title}</p><p className="mt-1 text-3xl font-black">{metric.value}</p></CardContent></Card>;
        })}
      </section>
    </div>
  );
}
