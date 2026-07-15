import { ProductionMonitoringDashboard } from "@/components/monitoring/production-monitoring-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminProductionMonitoringPage() {
  return <ProductionMonitoringDashboard />;
}
