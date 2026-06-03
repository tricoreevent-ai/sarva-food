import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type FormAlertTone = "error" | "success" | "info";

const toneStyles = {
  error: {
    icon: AlertCircle,
    wrap: "border-red-300 bg-red-50 text-red-950",
    iconClass: "text-red-600",
    title: "text-red-900",
    body: "text-red-800",
  },
  success: {
    icon: CheckCircle2,
    wrap: "border-emerald-300 bg-emerald-50 text-emerald-950",
    iconClass: "text-emerald-600",
    title: "text-emerald-900",
    body: "text-emerald-800",
  },
  info: {
    icon: Info,
    wrap: "border-sky-300 bg-sky-50 text-sky-950",
    iconClass: "text-sky-600",
    title: "text-sky-900",
    body: "text-sky-800",
  },
} satisfies Record<FormAlertTone, { icon: typeof AlertCircle; wrap: string; iconClass: string; title: string; body: string }>;

export function FormAlert({
  title,
  message,
  tone = "error",
  className,
}: {
  title?: string;
  message: string;
  tone?: FormAlertTone;
  className?: string;
}) {
  const styles = toneStyles[tone];
  const Icon = styles.icon;

  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border p-3 text-sm shadow-sm", styles.wrap, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", styles.iconClass)} aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className={cn("font-black", styles.title)}>{title}</p> : null}
        <p className={cn("font-semibold leading-6", title ? "mt-1" : "", styles.body)}>{message}</p>
      </div>
    </div>
  );
}
