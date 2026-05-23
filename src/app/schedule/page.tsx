import { Suspense } from "react";
import { ScheduleOrderFlow } from "@/components/flows/schedule-order-flow";
import { CustomerShell } from "@/components/layout/customer-shell";
import { InlineLoading } from "@/components/state/page-state";

export default function SchedulePage() {
  return (
    <CustomerShell>
      <main className="container-page py-5 sm:py-8">
        <Suspense fallback={<InlineLoading label="Loading schedule ordering" />}>
          <ScheduleOrderFlow />
        </Suspense>
      </main>
    </CustomerShell>
  );
}
