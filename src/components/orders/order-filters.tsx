import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrderFilters<T extends string>({
  filters,
  active,
  onChange,
}: {
  filters: Array<{ key: T; label: string; count: number; icon: LucideIcon }>;
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <nav className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Staff and operations filters">
      <h2 className="mb-1 px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Staff</h2>
      <div className="grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const selected = active === filter.key;
          const label = filter.key === "all" ? "All Staff" : filter.label;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => onChange(filter.key)}
              className={cn(
                "inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-black transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-emerald-600 sm:min-h-10 sm:justify-start",
                selected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-transparent text-slate-600 hover:bg-slate-50",
              )}
              aria-pressed={selected}
              aria-label={`${label}: ${filter.count} orders`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
              <span className={cn("inline-flex min-w-5 shrink-0 justify-center rounded-full px-1.5 py-0.5 text-[10px]", selected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{filter.count}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
