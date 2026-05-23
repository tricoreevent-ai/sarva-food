import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", statusClass[key] ?? statusClass.default)}>
      {status}
    </span>
  );
}

const statusClass: Record<string, string> = {
  new: "bg-violet-50 text-violet-700",
  accepted: "bg-blue-50 text-blue-700",
  preparing: "bg-orange-50 text-orange-700",
  ready: "bg-emerald-50 text-emerald-700",
  delivered: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
  default: "bg-slate-100 text-slate-700",
};
