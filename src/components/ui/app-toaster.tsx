"use client";

import { ToastBar, Toaster, toast } from "react-hot-toast";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Z_INDEX } from "@/lib/z-index";
import { cn } from "@/lib/utils";

export type SarvaNotificationTone = "success" | "warning" | "error" | "info" | "critical";
export type SarvaNotificationAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
};

export type SarvaNotificationProps = {
  id?: string;
  visible?: boolean;
  tone?: SarvaNotificationTone;
  title: ReactNode;
  message?: ReactNode;
  meta?: ReactNode;
  actions?: SarvaNotificationAction[];
  duration?: number;
  onClose?: () => void;
};

export function SarvaNotification({
  id,
  visible = true,
  tone = "info",
  title,
  message,
  meta,
  actions = [],
  duration,
  onClose,
}: SarvaNotificationProps) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? XCircle : tone === "info" ? Info : AlertTriangle;
  const progressDuration = duration ?? toneDuration(tone);
  const close = () => {
    onClose?.();
    if (id) toast.dismiss(id);
  };

  return (
    <div className={cn("sarva-notification-card group relative w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-white p-3 text-left shadow-2xl", toneClasses(tone).shell, visible ? "animate-in slide-in-from-top-2 fade-in" : "animate-out fade-out")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneClasses(tone).icon)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-950">{title}</p>
          {message ? <div className="mt-1 text-xs font-bold leading-5 text-slate-600">{message}</div> : null}
          {meta ? <div className="mt-1 text-xs font-semibold text-slate-500">{meta}</div> : null}
        </div>
        <button type="button" className="grid size-7 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100" onClick={close} aria-label="Close notification">
          <X className="size-4" />
        </button>
      </div>
      {actions.length ? (
        <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(actions.length, 3)}, minmax(0, 1fr))` }}>
          {actions.map((action) => (
            <button key={action.label} type="button" className={cn("min-h-9 rounded-lg border px-3 text-xs font-black", actionClasses(action.variant ?? "secondary"))} onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
      {Number.isFinite(progressDuration) ? <span className={cn("sarva-toast-progress group-hover:[animation-play-state:paused]", toneClasses(tone).bar)} style={{ animationDuration: `${progressDuration}ms` }} /> : null}
    </div>
  );
}

export function showSarvaNotification(input: Omit<SarvaNotificationProps, "id" | "visible"> & { id?: string }) {
  const duration = input.duration ?? toneDuration(input.tone ?? "info");
  return toast.custom((item) => <SarvaNotification {...input} id={item.id} visible={item.visible} duration={duration} />, {
    id: input.id,
    duration,
    position: "top-right",
  });
}

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerClassName="sarva-toast-container"
      containerStyle={{
        zIndex: Z_INDEX.toast,
      }}
      toastOptions={{
        duration: 3800,
        ariaProps: { role: "status", "aria-live": "polite" },
        className: "sarva-toast sarva-toast-info",
        success: {
          duration: 3600,
          className: "sarva-toast sarva-toast-success",
          iconTheme: { primary: "#059669", secondary: "#ecfdf5" },
        },
        error: {
          duration: 4000,
          className: "sarva-toast sarva-toast-error",
          iconTheme: { primary: "#ef4444", secondary: "#fef2f2" },
        },
        loading: {
          duration: 3800,
          className: "sarva-toast sarva-toast-warning",
          iconTheme: { primary: "#f97316", secondary: "#fff7ed" },
        },
      }}
    >
      {(item) => (
        <ToastBar toast={item}>
          {({ icon, message }) => (
            item.type === "custom" ? <>{message}</> : <div className="flex w-[min(24rem,calc(100vw-2rem))] min-w-0 items-center gap-3">
              <span className="shrink-0">{icon}</span>
              <div className="min-w-0 flex-1">{message}</div>
              <button
                type="button"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-white/70 text-current hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                onClick={() => toast.dismiss(item.id)}
                aria-label="Close notification"
              >
                <X className="size-4" />
              </button>
              <span className="sarva-toast-progress" style={{ animationDuration: `${item.duration ?? 3800}ms` }} />
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}

function toneDuration(tone: SarvaNotificationTone) {
  if (tone === "critical") return 9000;
  if (tone === "error") return 6000;
  if (tone === "warning") return 5200;
  return 4200;
}

function toneClasses(tone: SarvaNotificationTone) {
  if (tone === "success") return { shell: "border-emerald-200", icon: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" };
  if (tone === "warning") return { shell: "border-amber-200", icon: "bg-amber-50 text-amber-700", bar: "bg-amber-500" };
  if (tone === "error") return { shell: "border-red-200", icon: "bg-red-50 text-red-700", bar: "bg-red-500" };
  if (tone === "critical") return { shell: "border-red-300 ring-2 ring-red-100", icon: "bg-red-100 text-red-700", bar: "bg-red-600" };
  return { shell: "border-blue-200", icon: "bg-blue-50 text-blue-700", bar: "bg-blue-500" };
}

function actionClasses(variant: NonNullable<SarvaNotificationAction["variant"]>) {
  if (variant === "primary") return "border-orange-600 bg-orange-600 text-white hover:bg-orange-700";
  if (variant === "danger") return "border-red-300 bg-white text-red-700 hover:bg-red-50";
  return "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}
