import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, X } from "lucide-react";
import { Z_INDEX } from "@/lib/z-index";
import { cn } from "@/lib/utils";
import { actionClass } from "./OrderAccordion.utils";
import type { OrderAccordionAction } from "./OrderAccordion.types";

const menuWidth = 224;
const menuGap = 8;

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
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasActions = Boolean(primaryAction || secondaryActions.length || moreActions.length);

  const run = useCallback((action: OrderAccordionAction) => {
    setOpen(false);
    action.onClick();
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    setMobile(isMobile);
    if (isMobile) return;
    const rect = trigger.getBoundingClientRect();
    const height = menuRef.current?.offsetHeight ?? Math.min(360, moreActions.length * 40 + 12);
    const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth));
    const below = rect.bottom + menuGap;
    const top = below + height > window.innerHeight - 12 ? Math.max(12, rect.top - height - menuGap) : below;
    setPosition({ left, top });
  }, [moreActions.length]);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, updatePosition]);

  if (!hasActions) return null;

  return (
    <div className="relative grid content-start gap-2 border-t border-slate-100 bg-white p-4 xl:border-l xl:border-t-0">
      <p className="text-[11px] font-black uppercase text-slate-500">Actions</p>
      {primaryAction ? (
        <button type="button" disabled={primaryAction.disabled} title={primaryAction.title ?? primaryAction.label} onClick={() => run(primaryAction)} className={cn("inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50", actionClass(primaryAction))}>
          {primaryAction.icon}
          {primaryAction.label}
        </button>
      ) : null}
      {secondaryActions.map((action) => (
        <button key={action.id} type="button" disabled={action.disabled} title={action.title ?? action.label} aria-label={action.title ?? action.label} onClick={() => run(action)} className={cn("inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50", actionClass(action))}>
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
      {moreActions.length ? (
        <div className="relative">
          <button ref={triggerRef} type="button" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-black text-slate-600 hover:bg-slate-50" onClick={() => setOpen((value) => !value)} aria-label="More order actions" aria-haspopup="menu" aria-expanded={open} title="More actions">
            <MoreHorizontal className="size-4" />
            More Actions
          </button>
          {open && mounted ? createPortal(
            mobile ? (
              <div className="fixed inset-0 bg-slate-950/30" style={{ zIndex: Z_INDEX.toast + 10 }} role="presentation">
                <div ref={menuRef} className="safe-bottom fixed inset-x-0 bottom-0 rounded-t-2xl border border-slate-200 bg-white p-3 shadow-2xl" role="menu" aria-label="More order actions">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-950">More actions</p>
                    <button type="button" className="grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100" onClick={() => setOpen(false)} aria-label="Close actions">
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="grid gap-1">
                    {moreActions.map((action) => (
                      <button key={action.id} type="button" disabled={action.disabled} role="menuitem" className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-black disabled:opacity-50", action.variant === "danger" ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50")} onClick={() => run(action)}>
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div ref={menuRef} className="fixed max-h-[min(26rem,calc(100vh-1.5rem))] w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl" style={{ left: position.left, top: position.top, zIndex: Z_INDEX.toast + 10 }} role="menu" aria-label="More order actions">
                {moreActions.map((action) => (
                  <button key={action.id} type="button" disabled={action.disabled} role="menuitem" className={cn("flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-black disabled:opacity-50", action.variant === "danger" ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50")} onClick={() => run(action)}>
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            ),
            document.body,
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
