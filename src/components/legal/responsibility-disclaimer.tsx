"use client";

import { ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { cn } from "@/lib/utils";

export function ResponsibilityDisclaimer({
  surface = "inline",
  className,
}: {
  surface?: "inline" | "footer" | "checkout";
  className?: string;
}) {
  const cmsSettings = useAppStore((state) => state.cmsSettings) ?? defaultCmsSettings;
  const text = cmsSettings.disclaimer || defaultCmsSettings.disclaimer;

  if (surface === "footer" && cmsSettings.footer?.visible === false) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-orange-100 bg-orange-50/70 p-4 text-sm leading-6 text-slate-700",
        surface === "footer" && "rounded-none border-x-0 border-b-0 bg-white px-4 py-5 text-xs text-slate-500 md:px-8",
        surface === "checkout" && "bg-amber-50/80",
        className,
      )}
      aria-label="Responsibility disclaimer"
    >
      <div className={cn("mx-auto flex max-w-7xl gap-3", surface === "inline" && "max-w-none")}>
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-orange-600" aria-hidden="true" />
        <p>{surface === "footer" ? cmsSettings.footer?.note || text : text}</p>
      </div>
    </section>
  );
}
