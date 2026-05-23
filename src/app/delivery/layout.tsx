import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell app="delivery">
      {children}
    </DashboardShell>
  );
}
