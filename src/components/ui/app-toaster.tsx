"use client";

import { ToastBar, Toaster, toast } from "react-hot-toast";
import { X } from "lucide-react";
import { Z_INDEX } from "@/lib/z-index";

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
            <div className="flex w-[min(24rem,calc(100vw-2rem))] min-w-0 items-center gap-3">
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
