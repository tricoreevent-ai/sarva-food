import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell app="pos">
      {children}
    </DashboardShell>
  );
}
