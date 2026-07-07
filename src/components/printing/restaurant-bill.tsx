import { getPaperLineWidth, renderReceiptLines, type BillContext } from "@/lib/print-engine";
import type { PrintTemplate } from "@/lib/types";

export function RestaurantBill({ context, template }: { context: BillContext; template: PrintTemplate }) {
  const receiptLines = renderReceiptLines(context, template);
  const width = getPaperLineWidth(template);
  const compact = template.paperWidth !== "A4";
  const pixelWidth =
    template.paperWidth === "58mm" ? "236px" :
    template.paperWidth === "80mm" ? "384px" :
    template.paperWidth === "100mm" ? "472px" :
    template.paperWidth === "label" ? "236px" :
    undefined;

  return (
    <div
      data-paper-width={template.paperWidth}
      className={compact ? "mx-auto bg-white p-4 text-black shadow-sm print:shadow-none" : "mx-auto max-w-3xl bg-white p-8 text-black shadow-sm print:shadow-none"}
      style={compact ? { width: pixelWidth } : undefined}
    >
      <pre
        className="m-0 overflow-visible whitespace-pre font-mono leading-[1.18] tracking-normal text-black"
        style={{ fontSize: compact ? 11 : 13, width: `${width}ch`, maxWidth: "none" }}
      >
        {receiptLines.join("\n")}
      </pre>
    </div>
  );
}
