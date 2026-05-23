import Link from "next/link";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { StatusBadge } from "@/components/owner/status-badge";
import { formatCurrency } from "@/lib/utils";

export type OwnerOrderRow = {
  id: string;
  time: string;
  customer: string;
  status: string;
  amount: number;
};

export function OrderList({ orders }: { orders: OwnerOrderRow[] }) {
  return (
    <DashboardCard
      title="Recent Orders"
      action={<Link href="/owner/orders" className="text-sm font-bold text-orange-600">View all</Link>}
    >
      {orders.length ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-black text-neutral-950">{order.id}</p>
                  <p className="text-sm font-medium text-slate-500">{order.time}</p>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">{order.customer}</p>
              </div>
              <p className="font-black text-neutral-950">{formatCurrency(order.amount)}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center">
          <p className="font-black text-neutral-950">No recent orders</p>
          <p className="mt-1 text-sm text-slate-500">Live orders will appear here as soon as they arrive.</p>
        </div>
      )}
    </DashboardCard>
  );
}
