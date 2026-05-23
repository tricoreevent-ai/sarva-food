import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { TimelineStep } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-4" aria-label="Order progress">
      {steps.map((step) => {
        const Icon =
          step.status === "done" ? CheckCircle2 : step.status === "active" ? Loader2 : Circle;

        return (
          <li key={step.label} className="grid grid-cols-[2rem_1fr] gap-3">
            <span
              className={cn(
                "mt-1 grid size-8 place-items-center rounded-full border",
                step.status === "done" && "border-success bg-success text-white",
                step.status === "active" && "border-primary bg-primary text-primary-foreground",
                step.status === "pending" && "bg-card text-muted-foreground",
              )}
            >
              <Icon
                className={cn("size-4", step.status === "active" && "animate-spin")}
                aria-hidden="true"
              />
            </span>
            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{step.label}</h3>
                <time className="text-xs font-semibold text-muted-foreground">{step.time}</time>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
