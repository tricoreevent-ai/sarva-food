import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickActionButton({
  href,
  icon: Icon,
  label,
  tone = "orange",
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  tone?: "orange" | "green" | "blue" | "purple" | "red" | "cyan";
}) {
  return (
    <Link
      href={href}
      title={label}
      className="group flex min-h-20 min-w-24 flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-center text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500"
    >
      <span className={cn("grid size-9 place-items-center rounded-xl transition group-hover:scale-105", toneClass[tone])}>
        <Icon className="size-5" />
      </span>
      <span className="max-w-full truncate whitespace-nowrap">{label}</span>
    </Link>
  );
}

const toneClass = {
  orange: "bg-orange-50 text-orange-600",
  green: "bg-emerald-50 text-emerald-600",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-violet-50 text-violet-600",
  red: "bg-red-50 text-red-600",
  cyan: "bg-cyan-50 text-cyan-600",
};
