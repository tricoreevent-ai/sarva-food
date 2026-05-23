import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function OrderMetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "orange",
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone?: "orange" | "green" | "blue" | "purple";
}) {
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm", toneClass[tone].border)}>
      <span className={cn("grid size-14 place-items-center rounded-2xl", toneClass[tone].bg, toneClass[tone].text)}>
        <Icon className="size-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <p className="mt-1 text-3xl font-black text-neutral-950">{value}</p>
        <p className="text-sm text-slate-500">{note}</p>
      </div>
    </div>
  );
}

const toneClass = {
  orange: { border: "border-orange-200", bg: "bg-orange-50", text: "text-orange-600" },
  green: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-600" },
  blue: { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-600" },
  purple: { border: "border-violet-200", bg: "bg-violet-50", text: "text-violet-600" },
};
