import { redirect } from "next/navigation";

export default async function RestaurantItemShortLinkPage({ params }: { params: Promise<{ slug: string; itemId: string }> }) {
  const { slug, itemId } = await params;
  redirect(`/restaurant/${slug}/item/${itemId}`);
}
