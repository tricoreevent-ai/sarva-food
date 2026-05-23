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
    <div className="customer-scroll flex gap-3 overflow-x-auto pb-1">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const selected = active === filter.key;
        return (
          <button
            key={filter.key}
            type="button"
            onClick={() => onChange(filter.key)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold shadow-sm transition",
              selected ? "border-orange-300 bg-orange-50 text-orange-600" : "border-neutral-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            <Icon className="size-4" />
            {filter.label}
            <span className={selected ? "text-orange-600" : "text-slate-500"}>({filter.count})</span>
          </button>
        );
      })}
    </div>
  );
}
