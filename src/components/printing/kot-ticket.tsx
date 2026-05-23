"use client";

import { getPaperLineWidth, renderKotLines, type KotContext } from "@/lib/print-engine";
import type { PrintTemplate } from "@/lib/types";

export function KotTicket({ context, template }: { context: KotContext; template: PrintTemplate }) {
  const lines = renderKotLines(context, template);
  const width = getPaperLineWidth(template);
  const pixelWidth =
    template.paperWidth === "58mm" ? "236px" :
    template.paperWidth === "80mm" ? "384px" :
    template.paperWidth === "100mm" ? "472px" :
    template.paperWidth === "label" ? "236px" :
    "100%";
  return (
    <div
      data-paper-width={template.paperWidth}
      className="mx-auto bg-white p-4 text-black shadow-sm print:shadow-none"
      style={{ width: pixelWidth }}
    >
      <pre
        className="m-0 overflow-visible whitespace-pre font-mono text-[12px] leading-[1.18] tracking-normal text-black"
        style={{ width: `${width}ch`, maxWidth: "none" }}
      >
        {lines.join("\n")}
      </pre>
    </div>
  );
}
