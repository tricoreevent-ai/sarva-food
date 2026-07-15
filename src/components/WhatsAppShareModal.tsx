"use client";

import { Clipboard, ExternalLink, Loader2, MessageCircle, X } from "lucide-react";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WhatsAppSharePreview } from "@/hooks/useWhatsAppShare";
import { formatCurrency } from "@/lib/utils";

export function WhatsAppShareModal({
  preview,
  open,
  preparing = false,
  onOpenChange,
  onCopy,
  onWhatsApp,
}: {
  preview: WhatsAppSharePreview | null;
  open: boolean;
  preparing?: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
  onWhatsApp: () => void;
}) {
  const item = preview?.item;
  const price = item ? item.deliveryPrice ?? item.parcelPrice ?? item.dineInPrice ?? item.price : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>WhatsApp promotion preview</DialogTitle>
          <DialogDescription>
            Review the generated message before sending it to a customer, group, or contact.
          </DialogDescription>
        </DialogHeader>

        {preparing ? (
          <div className="grid min-h-72 place-items-center p-6 text-sm font-bold text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Preparing share message
            </span>
          </div>
        ) : preview && item ? (
          <div className="grid gap-5 p-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <SafeImage
                  src={item.image}
                  alt={item.name}
                  fill
                  fallbackSrc={IMAGE_FALLBACKS.food}
                  cloudinaryPreset="productGrid"
                  sizes="320px"
                  className="object-cover"
                />
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="line-clamp-2 font-black text-foreground">{item.name}</p>
                <p className="mt-1 text-sm font-bold text-primary">{formatCurrency(price)}</p>
                <p className="mt-2 break-all text-xs font-semibold text-muted-foreground">{preview.shortUrl}</p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <a href={preview.originalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open item page
                </a>
              </Button>
            </div>

            <div className="min-w-0 space-y-3">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">Generated WhatsApp message</p>
                <textarea
                  readOnly
                  value={preview.message}
                  className="mt-2 min-h-[360px] w-full resize-none rounded-lg border bg-background p-4 text-sm font-semibold leading-6 text-foreground"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  <X className="size-4" />
                  Cancel
                </Button>
                <Button type="button" variant="outline" onClick={onCopy}>
                  <Clipboard className="size-4" />
                  Copy
                </Button>
                <Button type="button" onClick={onWhatsApp}>
                  <MessageCircle className="size-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
