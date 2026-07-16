import { cn } from "@/lib/utils";
import type { OrderAccordionAccent, OrderAccordionAction, OrderBadgeTone, OrderDelayLevel, OrderWorkflowStepState } from "./OrderAccordion.types";

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

export function accentCardClass(accent: OrderAccordionAccent = "slate") {
  if (accent === "blue") return "border-l-4 border-l-blue-500";
  if (accent === "orange") return "border-l-4 border-l-orange-500";
  if (accent === "emerald") return "border-l-4 border-l-emerald-500";
  if (accent === "violet") return "border-l-4 border-l-violet-500";
  if (accent === "amber") return "border-l-4 border-l-amber-500";
  if (accent === "red") return "border-l-4 border-l-red-500";
  return "border-l-4 border-l-slate-300";
}

export function workflowStepClass(state: OrderWorkflowStepState) {
  if (state === "complete") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (state === "active") return "border-orange-200 bg-orange-50 text-orange-700";
  if (state === "blocked") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-500";
}

export function progressToneClass(tone: "default" | "danger" | "success" | "warning" = "default") {
  if (tone === "success") return "bg-emerald-500";
  if (tone === "warning") return "bg-amber-500";
  if (tone === "danger") return "bg-red-500";
  return "bg-blue-500";
}
