import { redirect } from "next/navigation";

export default async function CategoryCampaignPage({ params }: { params: Promise<{ slug: string; category: string }> }) {
  const { slug, category } = await params;
  redirect(`/restaurant/${encodeURIComponent(slug)}/menu?category=${encodeURIComponent(category)}`);
}
