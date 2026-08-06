"use client";

import { useState } from "react";
import { Clipboard, Download, ExternalLink, Link2, Loader2, MessageCircle, Monitor, Smartphone } from "lucide-react";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { marketingToneOptions, whatsappTemplateOptions, type MarketingTone, type WhatsAppTemplateKind } from "@/features/marketing/messageTemplates";
import type { WhatsAppSharePreview } from "@/hooks/useWhatsAppShare";
import type { WhatsAppContentOptions } from "@/services/whatsappTemplate";
import { formatCurrency } from "@/lib/utils";

type Props = {
  preview: WhatsAppSharePreview | null;
  open: boolean;
  preparing?: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
  onCopyLink?: () => void;
  onWhatsApp: () => void;
  onWhatsAppWeb?: () => void;
  onUpdate?: (patch: { template?: WhatsAppTemplateKind; tone?: MarketingTone; content?: Partial<WhatsAppContentOptions>; message?: string }) => void;
  onDownload?: () => void;
  onChannel?: (channel: "telegram" | "sms" | "email") => void;
};

const optionLabels: Record<keyof WhatsAppContentOptions, string> = { includeImage: "Image", includePrice: "Price", includeDescription: "Description", includeOffer: "Offer", includeAddress: "Restaurant address", includePhone: "Phone", includeOrderLink: "Order link", includeDelivery: "Delivery available", includePrepTime: "Preparation time" };

export function WhatsAppShareModal({ preview, open, preparing = false, onOpenChange, onCopy, onCopyLink, onWhatsApp, onWhatsAppWeb, onUpdate, onDownload }: Props) {
  const [downloading, setDownloading] = useState(false);
  const item = preview?.item;
  const price = item ? item.deliveryPrice ?? item.parcelPrice ?? item.dineInPrice ?? item.price : 0;

  async function downloadPoster() {
    if (!preview || downloading) return;
    setDownloading(true);
    try { await createPoster(preview); onDownload?.(); } finally { setDownloading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] max-w-6xl overflow-hidden p-0 max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none">
        <DialogHeader className="border-b px-5 py-4 pr-12">
          <DialogTitle>WhatsApp Marketing Studio</DialogTitle>
          <DialogDescription>Build, preview and share a customer-safe promotion. No private menu data is included.</DialogDescription>
        </DialogHeader>
        {preparing ? <div className="grid min-h-80 place-items-center"><span className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><Loader2 className="size-4 animate-spin" />Preparing campaign</span></div> : preview && item ? (
          <div className="grid max-h-[calc(96dvh-86px)] overflow-y-auto lg:grid-cols-[minmax(300px,.85fr)_minmax(360px,1.15fr)]">
            <section className="space-y-4 border-b bg-muted/20 p-4 lg:border-b-0 lg:border-r lg:p-5" aria-label="Promotion preview">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="relative aspect-[4/3] bg-muted"><SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} cloudinaryPreset="large" sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" /></div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative size-11 overflow-hidden rounded-full border bg-background"><SafeImage src={preview.restaurant?.logo || preview.restaurant?.image} alt="Restaurant logo" fill fallbackSrc={IMAGE_FALLBACKS.restaurant} sizes="44px" className="object-cover" /></div>
                    <div><p className="font-black">{preview.restaurantName}</p><p className="text-xs font-semibold text-muted-foreground">{item.category || "Menu item"}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2"><span className={item.isVeg ? "rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800" : "rounded-full bg-red-100 px-2 py-1 text-xs font-black text-red-800"}>{item.isVeg ? "Veg" : "Non Veg"}</span>{item.isPopular ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">Best seller</span> : null}{item.soldOut ? <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-black">Unavailable</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">Available</span>}</div>
                  <div><h3 className="text-xl font-black">{item.name}</h3><p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.description}</p></div>
                  <div className="grid grid-cols-2 gap-2 text-sm"><Meta label="Delivery" value={formatCurrency(price)} /><Meta label="Parcel" value={item.parcelPrice ? formatCurrency(item.parcelPrice) : "Optional"} /><Meta label="Preparation" value={item.prepTime || "On request"} /><Meta label="Rating" value={item.averageRating ? `★ ${item.averageRating.toFixed(1)}` : "Not displayed"} /></div>
                  <div className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-black text-primary-foreground">Order Now</div>
                </div>
              </div>
              <p className="break-all text-xs font-semibold text-muted-foreground">{preview.originalUrl}</p>
            </section>

            <section className="space-y-4 p-4 lg:p-5" aria-label="Marketing message builder">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Campaign template" value={preview.template} options={whatsappTemplateOptions} onChange={(value) => onUpdate?.({ template: value as WhatsAppTemplateKind })} />
                <Select label="Message style" value={preview.tone} options={marketingToneOptions} onChange={(value) => onUpdate?.({ tone: value as MarketingTone })} />
              </div>
              <fieldset><legend className="mb-2 text-xs font-black uppercase text-muted-foreground">Include in message</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(Object.keys(optionLabels) as Array<keyof WhatsAppContentOptions>).map((key) => <label key={key} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 text-xs font-bold"><input type="checkbox" checked={preview.content[key]} onChange={(event) => onUpdate?.({ content: { [key]: event.target.checked } })} />{optionLabels[key]}</label>)}</div></fieldset>
              <label className="block"><span className="text-xs font-black uppercase text-muted-foreground">Editable live message</span><textarea value={preview.message} onChange={(event) => onUpdate?.({ message: event.target.value })} readOnly={!onUpdate} aria-label="WhatsApp marketing message" className="mt-2 min-h-72 w-full resize-y rounded-xl border bg-background p-4 text-sm font-semibold leading-6 outline-none focus:ring-2 focus:ring-ring" /></label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Button type="button" variant="outline" onClick={onCopy}><Clipboard className="size-4" />Copy Message</Button>
                <Button type="button" variant="outline" onClick={onCopyLink} disabled={!onCopyLink}><Link2 className="size-4" />Copy Link</Button>
                <Button type="button" variant="outline" onClick={() => void downloadPoster()} disabled={downloading}>{downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}Promo Image</Button>
                <Button type="button" variant="outline" onClick={onWhatsAppWeb ?? onWhatsApp}><Monitor className="size-4" />WhatsApp Web</Button>
                <Button type="button" variant="outline" onClick={onWhatsApp}><Smartphone className="size-4" />WhatsApp App</Button>
                <Button type="button" onClick={onWhatsApp}><MessageCircle className="size-4" />Share Contact / Group</Button>
              </div>
              <Button asChild variant="ghost" className="w-full"><a href={preview.originalUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Preview customer item page</a></Button>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Meta({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted p-2"><span className="block text-xs font-bold text-muted-foreground">{label}</span><span className="font-black">{value}</span></div>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="text-xs font-black text-muted-foreground">{label}<select className="mt-1 h-11 w-full rounded-lg border bg-background px-3 text-sm font-bold text-foreground" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }

async function createPoster(preview: WhatsAppSharePreview) {
  const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  ctx.fillStyle = color ? `hsl(${color})` : "#166534"; ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#fff"; ctx.fillRect(48, 48, 984, 1254);
  const image = await loadImage(preview.item.image).catch(() => null);
  if (image) { ctx.save(); ctx.beginPath(); ctx.roundRect(80, 80, 920, 620, 28); ctx.clip(); ctx.drawImage(image, 80, 80, 920, 620); ctx.restore(); }
  ctx.fillStyle = "#111827"; ctx.font = "800 44px system-ui"; ctx.fillText(preview.restaurantName.slice(0, 34), 80, 780);
  ctx.font = "900 68px system-ui"; wrapText(ctx, preview.item.name, 80, 880, 700, 78);
  const price = preview.item.deliveryPrice ?? preview.item.parcelPrice ?? preview.item.price;
  ctx.fillStyle = "#166534"; ctx.font = "900 58px system-ui"; ctx.fillText(formatCurrency(price), 80, 1085);
  ctx.fillStyle = "#111827"; ctx.font = "700 30px system-ui"; ctx.fillText("ORDER NOW", 80, 1160); ctx.font = "500 24px system-ui"; ctx.fillText(new URL(preview.originalUrl, location.origin).host, 80, 1210);
  const QRCode = await import("qrcode"); const qrUrl = await QRCode.toDataURL(preview.originalUrl, { width: 220, margin: 1, color: { dark: "#111827", light: "#ffffff" } }); const qr = await loadImage(qrUrl); ctx.drawImage(qr, 760, 1030, 220, 220);
  const link = document.createElement("a"); link.download = `${slugify(preview.item.name)}-whatsapp-promo.png`; link.href = canvas.toDataURL("image/png"); link.click();
}

function loadImage(src: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.crossOrigin = "anonymous"; image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, height: number) { let line = ""; for (const word of text.split(" ")) { const next = `${line}${word} `; if (ctx.measureText(next).width > width && line) { ctx.fillText(line, x, y); line = `${word} `; y += height; } else line = next; } ctx.fillText(line, x, y); }
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
