import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/firebase/admin";
import { SafeImage, IMAGE_FALLBACKS } from "@/components/media/safe-image";
import { APP_NAME } from "@/lib/constants";
import { campaignAvailability, type MarketingCampaign } from "@/features/marketing/campaign-engine";

type PublicCampaign = Pick<MarketingCampaign, "status" | "scheduleAt" | "orderingOpensAt" | "orderingClosesAt" | "expiresAt" | "autoDisableAt" | "maximumOrders" | "maximumQuantity" | "orderCount" | "quantityOrdered"> & { name: string; restaurantName: string; restaurantSlug: string; cta: string; type: string; items: Array<{ name: string; publicSlug: string; image: string; category: string; price: number; offerPrice?: number; isVeg: boolean; badges: string[] }> };

export async function generateMetadata({ params }: { params: Promise<{ slug: string; campaign: string }> }): Promise<Metadata> {
  const { slug, campaign } = await params; const data = await getCampaign(slug, campaign);
  return { title: data ? `${data.name} | ${data.restaurantName}` : `Campaign | ${APP_NAME}`, description: data ? `Order ${data.name} directly from ${data.restaurantName}.` : `Restaurant campaign on ${APP_NAME}.` };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string; campaign: string }> }) {
  const { slug, campaign } = await params; const data = await getCampaign(slug, campaign); if (!data) notFound(); const availability = campaignAvailability(data);
  return <main className="min-h-screen bg-muted/30"><section className="mx-auto max-w-6xl px-4 py-10"><p className="text-sm font-black uppercase tracking-widest text-primary">{data.type}</p><h1 className="mt-2 text-4xl font-black">{data.name}</h1><p className="mt-2 text-lg text-muted-foreground">From {data.restaurantName}</p><div className={availability.orderable ? "mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900" : "mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950"} role="status"><strong className="block text-base">{availability.orderable ? "Ordering is open" : availability.state === "sold-out" ? "Sold out" : availability.state === "coming-soon" || availability.state === "scheduled" ? "Coming soon" : "Ordering closed"}</strong>{availability.message}{!availability.orderable ? <span className="mt-1 block font-medium">Check today&apos;s available menu and best sellers below.</span> : null}</div><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((item) => <article key={item.publicSlug} className="overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="relative aspect-[4/3]"><SafeImage src={item.image} alt={item.name} fill fallbackSrc={IMAGE_FALLBACKS.food} sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" /></div><div className="space-y-3 p-4"><div className="flex flex-wrap gap-1">{item.badges.map((badge) => <span key={badge} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-black text-primary">{badge}</span>)}</div><h2 className="text-xl font-black">{item.name}</h2><p className="text-sm font-semibold text-muted-foreground">{item.category}</p><p className="text-lg font-black">₹{item.offerPrice || item.price}{item.offerPrice ? <span className="ml-2 text-sm text-muted-foreground line-through">₹{item.price}</span> : null}</p>{availability.orderable ? <Link className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 font-black text-primary-foreground" href={`/restaurant/${encodeURIComponent(slug)}/menu/${encodeURIComponent(item.publicSlug)}?source=campaign&campaign=${encodeURIComponent(campaign)}`}>{data.cta}</Link> : <span className="flex min-h-11 items-center justify-center rounded-xl bg-muted px-4 font-black text-muted-foreground">{availability.state === "sold-out" ? "Sold Out" : availability.state === "coming-soon" || availability.state === "scheduled" ? "Available Soon" : "Ordering Closed"}</span>}</div></article>)}</div><Link href={`/restaurant/${encodeURIComponent(slug)}/menu`} className="mt-8 flex min-h-12 items-center justify-center rounded-xl border bg-card px-5 font-black">View today&apos;s menu and recommended items</Link></section></main>;
}

async function getCampaign(slug: string, campaign: string) {
  const snapshot = await adminDb().collection("publicMarketingCampaigns").doc(`${slug}:${campaign}`).get();
  return snapshot.exists ? snapshot.data() as PublicCampaign : null;
}
