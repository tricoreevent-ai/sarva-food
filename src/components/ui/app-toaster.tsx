"use client";

import { ToastBar, Toaster, toast } from "react-hot-toast";
import { X } from "lucide-react";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      containerStyle={{
        top: "50%",
        right: "1rem",
        transform: "translateY(-50%)",
      }}
      toastOptions={{
        duration: 30000,
        className: "rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-950 shadow-xl",
        success: {
          className: "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-xl",
          iconTheme: { primary: "#059669", secondary: "#ecfdf5" },
        },
        error: {
          className: "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-950 shadow-xl",
          iconTheme: { primary: "#ef4444", secondary: "#fef2f2" },
        },
        loading: {
          className: "rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-950 shadow-xl",
          iconTheme: { primary: "#f97316", secondary: "#fff7ed" },
        },
      }}
    >
      {(item) => (
        <ToastBar toast={item}>
          {({ icon, message }) => (
            <div className="flex w-full min-w-64 items-center gap-3">
              <span className="shrink-0">{icon}</span>
              <div className="min-w-0 flex-1">{message}</div>
              <button
                type="button"
                className="grid size-7 shrink-0 place-items-center rounded-full bg-white/70 text-current hover:bg-white"
                onClick={() => toast.dismiss(item.id)}
                aria-label="Close notification"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
