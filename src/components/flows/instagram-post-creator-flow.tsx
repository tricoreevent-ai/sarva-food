"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CalendarClock, Loader2, Send, Wand2 } from "lucide-react";
import { SocialTemplateCard } from "@/components/studio/social-template-card";
import { SectionHeader } from "@/components/layout/section-header";
import { CloudinaryUploadWidget } from "@/components/media/cloudinary-upload-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/lib/app-store";
import { buildInstagramDeepLink } from "@/lib/social-commerce";
import {
  buildTemplateExport,
  SOCIAL_FORMATS,
  type SocialOutputFormat,
} from "@/lib/template-engine";

export function InstagramPostCreatorFlow() {
  const templates = useAppStore((state) => state.templates);
  const menuItems = useAppStore((state) => state.menuItems);
  const offers = useAppStore((state) => state.offers);
  const socialPosts = useAppStore((state) => state.socialPosts);
  const createSocialPost = useAppStore((state) => state.createSocialPost);
  const apiMessage = useAppStore((state) => state.apiMessage);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [headline, setHeadline] = useState("");
  const [caption, setCaption] = useState("");
  const [offerCode, setOfferCode] = useState("");
  const [cta, setCta] = useState("Order now");
  const [locationTag, setLocationTag] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [image, setImage] = useState(menuItems[0]?.image ?? "/icons/sarva-icon.svg");
  const [outputFormat, setOutputFormat] = useState<SocialOutputFormat>("instagram-feed");
  const [phase, setPhase] = useState<"idle" | "generating" | "ready" | "exported">("idle");
  const [postId, setPostId] = useState("");
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? templates[0];
  const selectedFormat = SOCIAL_FORMATS[outputFormat];

  const exportPayload = useMemo(
    () =>
      JSON.stringify(
        buildTemplateExport({
          postId,
          format: outputFormat,
          templateName: selectedTemplate?.name ?? "Template",
          headline,
          caption,
          offerCode,
          image,
          deepLink: buildInstagramDeepLink(menuItems[0]?.restaurantSlug ?? "", menuItems[0]?.id ?? "", offerCode),
        }),
        null,
        2,
      ),
    [caption, headline, image, menuItems, offerCode, outputFormat, postId, selectedTemplate?.name],
  );
  const exportHref = `data:application/json;charset=utf-8,${encodeURIComponent(exportPayload)}`;

  async function generatePreview() {
    if (!selectedTemplate) return;
    setPhase("generating");
    setPostId(`post-${crypto.randomUUID()}`);
    setPhase("ready");
  }

  async function exportPreview() {
    setPhase("exported");
  }

  async function submitForReview() {
    await createSocialPost({
      restaurantSlug: menuItems[0]?.restaurantSlug ?? "",
      foodImage: image,
      headline,
      offerCode,
      caption,
      cta,
      locationTag,
      scheduledAt: scheduledAt || undefined,
      channels: ["Instagram", "Facebook"],
    });
    setPhase("exported");
  }

  // Flow note: visual generation is frontend-only. Images are uploaded to Cloudinary,
  // while post drafts and publisher workflow stay in the existing data layer.
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section className="space-y-5">
          <SectionHeader
            title="Create post"
            description="Owners create posts and submit them to Nammude admin review. Publishing happens only from official accounts."
          />
        <Card>
          <CardContent className="grid gap-5 p-5">
            <div className="grid min-h-40 place-items-center rounded-lg border border-dashed bg-muted/40 p-6 text-center">
              <div>
                <p className="font-bold">Upload food image</p>
                <p className="mt-1 text-sm text-muted-foreground">Crop and optimize with Cloudinary.</p>
                <CloudinaryUploadWidget
                  folder="social"
                  restaurantId={menuItems[0]?.restaurantSlug}
                  aspectRatio={selectedFormat.width / selectedFormat.height}
                  tags={["social-post"]}
                  label="Upload and crop"
                  className="mt-4"
                  onUpload={(url) => setImage(url)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="post-format">Output format</Label>
              <select
                id="post-format"
                className="h-11 rounded-md border bg-background px-3 text-sm"
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value as SocialOutputFormat)}
              >
                {Object.entries(SOCIAL_FORMATS).map(([value, format]) => (
                  <option key={value} value={value}>
                    {format.label} - {format.width}x{format.height}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="post-title">Headline</Label>
              <Input
                id="post-title"
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="post-copy">Caption</Label>
              <Textarea
                id="post-copy"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="post-cta">CTA</Label>
                <Input id="post-cta" value={cta} onChange={(event) => setCta(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="post-location">Location tag</Label>
                <Input id="post-location" value={locationTag} onChange={(event) => setLocationTag(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="post-schedule">Schedule optional</Label>
              <Input id="post-schedule" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="post-offer">Offer code</Label>
              <select
                id="post-offer"
                className="h-11 rounded-md border bg-background px-3 text-sm"
                value={offerCode}
                onChange={(event) => setOfferCode(event.target.value)}
              >
                {offers.map((offer) => (
                  <option key={offer.code} value={offer.code}>
                    {offer.code}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={generatePreview} disabled={phase === "generating"}>
              {phase === "generating" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              Generate preview
            </Button>
            <Button type="button" variant="secondary" onClick={submitForReview}>
              <Send className="size-4" />
              Submit to admin review
            </Button>
            {apiMessage ? <p className="text-sm font-semibold text-primary">{apiMessage}</p> : null}
          </CardContent>
        </Card>
        <section className="grid gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="text-left"
              onClick={() => setTemplateId(template.id)}
              aria-pressed={template.id === templateId}
            >
              <div className={template.id === templateId ? "rounded-lg ring-2 ring-primary" : ""}>
                <SocialTemplateCard {...template} />
              </div>
            </button>
          ))}
        </section>
      </section>

      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">Generated preview</h2>
            <Badge variant={phase === "exported" ? "success" : "muted"}>{phase}</Badge>
          </div>
          <div
            className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-muted"
            style={{ aspectRatio: selectedFormat.aspectRatio }}
          >
            <Image src={image} alt="Food post preview" fill className="object-cover" />
            <div className="absolute inset-x-0 top-0 flex justify-between p-4">
              <Badge variant="secondary">{selectedFormat.label}</Badge>
              <Badge variant="accent">{offerCode}</Badge>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-white">
              <p className="text-3xl font-black">{headline}</p>
              <p className="mt-2 text-sm leading-6">{caption}</p>
              <p className="mt-3 text-xs font-bold uppercase">{cta}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={exportPreview} disabled={phase === "idle" || phase === "generating"} variant="outline">
              <CalendarClock className="size-4" />
              Export preview
            </Button>
            <Button asChild variant="outline">
              <a href={exportHref} download={`${postId.toLowerCase()}-preview.json`}>
                Download JSON
              </a>
            </Button>
          </div>
          <div className="space-y-2 rounded-md border bg-muted/40 p-3">
            <p className="text-sm font-bold">Approval queue</p>
            {socialPosts.slice(0, 3).map((post) => (
              <div key={post.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold">{post.headline}</span>
                <Badge variant={post.status === "rejected" ? "destructive" : post.status === "published" ? "success" : "warning"}>{post.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
