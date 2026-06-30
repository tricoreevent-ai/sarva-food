"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { CustomerShell } from "@/components/layout/customer-shell";
import { InlineLoading } from "@/components/state/page-state";

const ScheduleOrderFlow = dynamic(
  () => import("@/components/flows/schedule-order-flow").then((module) => module.ScheduleOrderFlow),
  { ssr: false, loading: () => <InlineLoading label="Loading schedule ordering" /> },
);

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
