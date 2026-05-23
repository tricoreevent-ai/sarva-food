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
      className="group flex min-h-14 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500"
    >
      <span className={cn("grid size-9 place-items-center rounded-xl transition group-hover:scale-105", toneClass[tone])}>
        <Icon className="size-5" />
      </span>
      {label}
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
