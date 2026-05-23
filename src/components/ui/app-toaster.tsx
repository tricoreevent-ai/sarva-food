"use client";

import { Toaster } from "react-hot-toast";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3600,
        className: "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-xl",
        success: {
          className: "rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-emerald-900 shadow-xl",
        },
        error: {
          className: "rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-semibold text-red-900 shadow-xl",
        },
      }}
    />
  );
}
