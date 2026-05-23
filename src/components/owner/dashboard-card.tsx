import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative rounded-2xl border border-neutral-200 bg-white shadow-sm", className)}>
      {title || action ? (
        <header className="flex items-center justify-between gap-3 px-5 pt-5">
          {title ? <h2 className="text-base font-black text-neutral-950">{title}</h2> : <span />}
          {action}
        </header>
      ) : null}
      <div className={title || action ? "p-5" : "p-5"}>{children}</div>
    </section>
  );
}
