import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell app="studio">
      {children}
    </DashboardShell>
  );
}
