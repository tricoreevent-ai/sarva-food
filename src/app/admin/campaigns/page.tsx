"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/client-toast";
import { Megaphone, MessageCircle, Plus, Save } from "lucide-react";
import { WhatsAppShareModal } from "@/components/WhatsAppShareModal";
import { OfferBadge } from "@/components/commerce/offer-badge";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultMarketingSettings, whatsappTemplateOptions, type MarketingSettings, type WhatsAppTemplateKind } from "@/features/marketing/messageTemplates";
import { useWhatsAppShare } from "@/hooks/useWhatsAppShare";
import { useAdminRepositoryData } from "@/hooks/use-admin-repository-data";
import type { MenuItem, Offer } from "@/lib/types";

export default function AdminCampaignsPage() {
  const { offers, menuItems, restaurants, campaignSettings, loading, saveCampaignSettings } = useAdminRepositoryData();
  const whatsappShare = useWhatsAppShare();
  const [marketingSettings, setMarketingSettings] = useState<MarketingSettings>(defaultMarketingSettings);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loading || loadedRef.current) return;
    loadedRef.current = true;
    const stored = campaignSettings[0];
    if (stored) queueMicrotask(() => setMarketingSettings({ ...defaultMarketingSettings, ...stored }));
  }, [campaignSettings, loading]);

  async function saveSettings() {
    await saveCampaignSettings(marketingSettings);
    toast.success("Marketing settings saved.");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Campaigns"
        description="Platform campaign overview for offers, Instagram pushes, and merchant promotions."
        action={
          <Button asChild>
            <a href="#campaign-list">
            <Plus className="size-4" />
            Review campaigns
            </a>
          </Button>
        }
      />
      <Card>
        <CardContent className="grid gap-4 p-5 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
          <label className="grid gap-2">
            <Label>Default message template</Label>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm font-semibold"
              value={marketingSettings.defaultTemplate}
              onChange={(event) => setMarketingSettings({ ...marketingSettings, defaultTemplate: event.target.value as WhatsAppTemplateKind })}
            >
              {whatsappTemplateOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="grid gap-2">
            <Label>Default CTA text</Label>
            <Input value={marketingSettings.defaultCtaText} onChange={(event) => setMarketingSettings({ ...marketingSettings, defaultCtaText: event.target.value })} placeholder="Buy Now" />
          </div>
          <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-bold">
            <input type="checkbox" checked={marketingSettings.tinyUrlEnabled} onChange={(event) => setMarketingSettings({ ...marketingSettings, tinyUrlEnabled: event.target.checked })} />
            TinyURL enabled
          </label>
          <div className="grid gap-2 xl:col-span-2">
            <Label>Promotional footer</Label>
            <Textarea value={marketingSettings.promotionalFooter} onChange={(event) => setMarketingSettings({ ...marketingSettings, promotionalFooter: event.target.value })} rows={3} />
          </div>
          <Button onClick={() => void saveSettings()}>
            <Save className="size-4" />
            Save settings
          </Button>
        </CardContent>
      </Card>
      <section id="campaign-list" className="grid gap-4 md:grid-cols-3">
        {offers.length ? offers.map((offer) => (
          <AdminCampaignCard
            key={offer.code}
            offer={offer}
            relatedItems={menuItems.filter((item) => offer.applicableItemIds?.includes(item.id)).slice(0, 3)}
            onShareItem={(item) => void whatsappShare.openShare({
              item,
              restaurant: restaurants.find((restaurant) => restaurant.slug === item.restaurantSlug),
              template: offer.offerType === "festival" ? "festival-offer" : "limited-time",
            })}
          />
        )) : (
          <div className="md:col-span-3">
            <EmptyStateCard
              title="No campaigns yet"
              description="Offers and campaigns from Firestore will appear here."
              actionLabel="Create offer"
              actionHref="/owner/offers"
            />
          </div>
        )}
      </section>
      <WhatsAppShareModal
        preview={whatsappShare.preview}
        open={Boolean(whatsappShare.preview) || whatsappShare.isPreparing}
        preparing={whatsappShare.isPreparing}
        onOpenChange={(open) => {
          if (!open) whatsappShare.closeShare();
        }}
        onCopy={() => void whatsappShare.copyMessage()}
        onWhatsApp={whatsappShare.openWhatsApp}
        onChannel={whatsappShare.openChannel}
      />
    </div>
  );
}

function AdminCampaignCard({
  offer,
  relatedItems,
  onShareItem,
}: {
  offer: Offer;
  relatedItems: MenuItem[];
  onShareItem: (item: MenuItem) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <Megaphone className="size-6 text-accent" aria-hidden="true" />
        <OfferBadge offer={offer} />
        <h2 className="font-bold">{offer.title}</h2>
        <p className="text-sm text-muted-foreground">{offer.description}</p>
        <Button className="w-full" variant="outline" asChild><Link href={`/admin/restaurants?restaurant=${encodeURIComponent(offer.restaurantSlug ?? "")}`}>Review targeting</Link></Button>
        {relatedItems.length ? (
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-black uppercase text-muted-foreground">Share campaign items</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {relatedItems.map((item) => (
                <Button key={item.id} type="button" size="sm" variant="outline" onClick={() => onShareItem(item)}>
                  <MessageCircle className="size-4" />
                  {item.name}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
