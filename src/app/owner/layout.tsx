import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell app="owner">
      {children}
    </DashboardShell>
  );
}
