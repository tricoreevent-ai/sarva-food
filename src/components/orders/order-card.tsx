import { Check, Eye, MapPinned, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/owner/status-badge";
import { formatCurrency } from "@/lib/utils";

export type OpsOrder = {
  id: string;
  displayId?: string;
  age: string;
  actualTime?: string;
  source: string;
  customer: string;
  phone: string;
  type: string;
  tableNumber?: string;
  status: string;
  itemCount: number;
  total: number;
  payment: string;
  instructions?: string;
  scheduledLabel?: string;
  prepSuggestion?: string;
};

export function OrderCard({
  order,
  onAccept,
  onReject,
  onReady,
  onComplete,
}: {
  order: OpsOrder;
  onAccept: () => void;
  onReject: () => void;
  onReady: () => void;
  onComplete: () => void;
}) {
  const isNew = order.status === "new";
  const isPreparing = order.status === "accepted" || order.status === "preparing";
  const isReady = order.status === "ready";
  const isDone = ["delivered", "completed", "cancelled", "rejected"].includes(order.status);

  return (
    <article className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_180px_220px] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-black text-neutral-950">{order.displayId ?? order.id}</h3>
          <StatusBadge status={order.status} />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{order.type}</span>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
          <span className="font-black text-slate-800">{order.age}</span>
          {order.actualTime ? <span>{order.actualTime}</span> : null}
          <span>•</span>
          <span>{order.source}</span>
          {order.tableNumber ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700">{order.tableNumber}</span> : null}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-black text-neutral-950">{order.customer}</span>
          {order.phone ? (
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Phone className="size-3.5" />
              {order.phone}
            </span>
          ) : null}
        </div>
        {order.scheduledLabel ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded-xl bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            <MapPinned className="size-3.5" />
            {order.scheduledLabel}
          </p>
        ) : null}
        {order.prepSuggestion ? <p className="mt-1 text-xs font-semibold text-slate-500">{order.prepSuggestion}</p> : null}
        {order.instructions ? <p className="mt-2 text-sm text-slate-600">{order.instructions}</p> : null}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-500">{order.itemCount} items</p>
        <p className="mt-1 text-2xl font-black text-neutral-950">{formatCurrency(order.total)}</p>
        <p className="text-sm text-slate-500">Payment: {order.payment}</p>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        {isNew ? (
          <>
            <Button size="sm" className="border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50" variant="outline" onClick={onAccept}>
              <Check className="size-4" />
              Accept
            </Button>
            <Button size="sm" className="border-red-400 bg-white text-red-600 hover:bg-red-50" variant="outline" onClick={onReject}>
              <X className="size-4" />
              Reject
            </Button>
          </>
        ) : null}
        {isPreparing ? (
          <Button size="sm" className="border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50" variant="outline" onClick={onReady}>
            <Check className="size-4" />
            Ready
          </Button>
        ) : null}
        {isReady ? (
          <Button size="sm" className="border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50" variant="outline" onClick={onComplete}>
            <Check className="size-4" />
            Mark Completed
          </Button>
        ) : null}
        <Button size="sm" variant="outline">
          <Eye className="size-4" />
          View
        </Button>
        {!isDone && order.source.toLowerCase().includes("delivery") ? (
          <Button size="sm" variant="outline">
            Track
          </Button>
        ) : null}
      </div>
    </article>
  );
}
