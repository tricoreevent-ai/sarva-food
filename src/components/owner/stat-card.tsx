import type { LucideIcon } from "lucide-react";
import { ArrowUp } from "lucide-react";
import { DashboardCard } from "@/components/owner/dashboard-card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "orange",
  points,
}: {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  tone?: "orange" | "green" | "blue" | "purple";
  points: number[];
}) {
  return (
    <DashboardCard className="min-h-36">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-neutral-950">{value}</p>
        </div>
        <span className={cn("grid size-12 place-items-center rounded-full", toneClass[tone].iconBg, toneClass[tone].text)}>
          <Icon className="size-5" />
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
          <ArrowUp className="size-4" />
          {delta}
        </p>
        <Sparkline points={points} className={toneClass[tone].stroke} />
      </div>
    </DashboardCard>
  );
}

function Sparkline({ points, className }: { points: number[]; className: string }) {
  const safe = points.length ? points : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe);
  const range = Math.max(1, max - min);
  const d = safe
    .map((point, index) => {
      const x = (index / Math.max(1, safe.length - 1)) * 92;
      const y = 34 - ((point - min) / range) * 28;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 92 40" className="h-10 w-24" aria-hidden="true">
      <path d={d} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} />
    </svg>
  );
}

const toneClass = {
  orange: { iconBg: "bg-orange-50", text: "text-orange-600", stroke: "stroke-orange-500" },
  green: { iconBg: "bg-emerald-50", text: "text-emerald-600", stroke: "stroke-emerald-500" },
  blue: { iconBg: "bg-blue-50", text: "text-blue-600", stroke: "stroke-blue-500" },
  purple: { iconBg: "bg-violet-50", text: "text-violet-600", stroke: "stroke-violet-500" },
};
