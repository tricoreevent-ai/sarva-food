import { cn } from "@/lib/utils";
import type { OrderAccordionAction, OrderBadgeTone, OrderDelayLevel } from "./OrderAccordion.types";

export function badgeToneClass(tone: OrderBadgeTone = "default") {
  if (tone === "success") return "border-emerald-100 bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "border-amber-100 bg-amber-50 text-amber-700";
  if (tone === "danger") return "border-red-100 bg-red-50 text-red-700";
  if (tone === "info") return "border-blue-100 bg-blue-50 text-blue-700";
  if (tone === "muted") return "border-slate-100 bg-slate-50 text-slate-600";
  return "border-slate-200 bg-white text-slate-700";
}

export function delayCardClass(level: OrderDelayLevel = "none") {
  return cn(
    level === "yellow" && "order-accordion-delay-yellow",
    level === "orange" && "order-accordion-delay-orange",
    level === "red" && "order-accordion-delay-red",
    level === "critical" && "order-accordion-delay-critical",
  );
}

export function actionClass(action: Pick<OrderAccordionAction, "variant">) {
  if (action.variant === "primary") return "bg-orange-600 text-white hover:bg-orange-700";
  if (action.variant === "danger") return "border-red-200 bg-white text-red-600 hover:bg-red-50";
  if (action.variant === "ghost") return "border-transparent bg-transparent text-slate-600 hover:bg-slate-50";
  return "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}
