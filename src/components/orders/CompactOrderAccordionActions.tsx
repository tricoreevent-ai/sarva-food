import { memo, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { actionClass } from "./OrderAccordion.utils";
import type { OrderAccordionAction } from "./OrderAccordion.types";

export const CompactOrderAccordionActions = memo(function CompactOrderAccordionActions({
  primaryAction,
  secondaryActions = [],
  moreActions = [],
}: {
  primaryAction?: OrderAccordionAction;
  secondaryActions?: OrderAccordionAction[];
  moreActions?: OrderAccordionAction[];
}) {
  const [open, setOpen] = useState(false);
  if (!primaryAction && !secondaryActions.length && !moreActions.length) return null;

  const run = (action: OrderAccordionAction) => {
    setOpen(false);
    action.onClick();
  };

  return (
    <div className="relative grid grid-cols-[repeat(auto-fit,minmax(44px,auto))] gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
      {secondaryActions.map((action) => (
        <button key={action.id} type="button" disabled={action.disabled} title={action.title ?? action.label} onClick={() => run(action)} className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50", actionClass(action))}>
          {action.icon}
          <span className="hidden sm:inline">{action.label}</span>
        </button>
      ))}
      {primaryAction ? (
        <button type="button" disabled={primaryAction.disabled} title={primaryAction.title ?? primaryAction.label} onClick={() => run(primaryAction)} className={cn("inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50", actionClass(primaryAction))}>
          {primaryAction.icon}
          {primaryAction.label}
        </button>
      ) : null}
      {moreActions.length ? (
        <div className="relative">
          <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50" onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} title="More actions">
            <MoreHorizontal className="size-4" />
          </button>
          {open ? (
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl" role="menu">
              {moreActions.map((action) => (
                <button key={action.id} type="button" disabled={action.disabled} role="menuitem" className={cn("flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-black disabled:opacity-50", action.variant === "danger" ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50")} onClick={() => run(action)}>
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
