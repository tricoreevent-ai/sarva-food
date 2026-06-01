"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrderLine } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function CartItem({
  line,
  onQuantity,
  onRemove,
}: {
  line: OrderLine;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-black text-slate-950">{line.name}</p>
          <p className="line-clamp-1 text-xs font-semibold text-slate-500">{formatCurrency(line.price)} each{line.notes ? ` · ${line.notes}` : ""}</p>
        </div>
        <div className="flex h-8 items-center rounded-lg border border-slate-200">
          <Button size="icon-sm" variant="ghost" onClick={() => onQuantity(line.quantity - 1)} aria-label={`Decrease ${line.name}`}>
            <Minus className="size-3.5" />
          </Button>
          <span className="w-7 text-center text-sm font-black">{line.quantity}</span>
          <Button size="icon-sm" variant="ghost" onClick={() => onQuantity(line.quantity + 1)} aria-label={`Increase ${line.name}`}>
            <Plus className="size-3.5" />
          </Button>
        </div>
        <Button size="icon-sm" variant="outline" className="h-8 w-8 border-red-200 text-red-600" onClick={onRemove} aria-label={`Remove ${line.name}`}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <p className="mt-1 text-right text-sm font-black text-slate-950">{formatCurrency(line.quantity * line.price)}</p>
    </div>
  );
}
