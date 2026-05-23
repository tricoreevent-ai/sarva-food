import { SimpleDataTable } from "@/components/dashboard/data-table";
import { SectionHeader } from "@/components/layout/section-header";
import { Card, CardContent } from "@/components/ui/card";

const history = [
  { order: "ORD-2440", area: "Indiranagar", status: "Delivered", earning: "Rs 62" },
  { order: "ORD-2441", area: "Domlur", status: "Delivered", earning: "Rs 58" },
  { order: "ORD-2442", area: "Koramangala", status: "Cancelled", earning: "Rs 20" },
];

export default function DeliveryHistoryPage() {
  // Screen note: History is intentionally table-first for scanning earnings and delivery states.
  return (
    <div className="space-y-6">
      <SectionHeader title="Delivery history" description="Completed, cancelled, and incentive states for rider review." />
      <Card>
        <CardContent className="p-0">
          <SimpleDataTable columns={["order", "area", "status", "earning"]} rows={history} />
        </CardContent>
      </Card>
    </div>
  );
}
