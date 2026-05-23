import { InstagramDeepLinkFlow } from "@/components/flows/instagram-deep-link-flow";
import { APP_NAME } from "@/lib/constants";
import { parseOfferCode } from "@/lib/social-commerce";

export async function generateMetadata() {
  return {
    title: `Instagram order | ${APP_NAME}`,
    description: `Open an Instagram click-to-order item in ${APP_NAME}.`,
  };
}

export default async function InstagramDeepLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantSlug: string; itemId: string }>;
  searchParams: Promise<{ offer?: string }>;
}) {
  const { restaurantSlug, itemId } = await params;
  const { offer } = await searchParams;

  return (
    <InstagramDeepLinkFlow
      restaurantSlug={restaurantSlug}
      itemId={itemId}
      offerCode={parseOfferCode(offer)}
    />
  );
}
