import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function CateringLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell app="catering">
      {children}
    </DashboardShell>
  );
}
