import { redirect } from "next/navigation";

export default async function RestaurantShortLinkPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/restaurant/${slug}`);
}
