import nextDynamic from "next/dynamic";
import type { Metadata } from "next";
import { CustomerShell } from "@/components/layout/customer-shell";
import { CustomerRouteSkeleton } from "@/components/state/route-skeletons";
import { getPublicRestaurantDocs } from "@/lib/server/public-firestore";
import { APP_DESCRIPTION, APP_NAME, APP_SEO_KEYWORDS, ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const RestaurantDetailClient = nextDynamic(
  () => import("@/components/flows/restaurant-detail-flow").then((module) => module.RestaurantDetailFlow),
  { loading: () => <CustomerRouteSkeleton variant="restaurant" /> },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantForMetadata(slug);
  if (!restaurant) {
    return {
      title: `Restaurant Not Found`,
      description: APP_DESCRIPTION,
      robots: { index: false, follow: true },
    };
  }

  const displayName = (restaurant as typeof restaurant & { displayName?: string }).displayName;
  const name = displayName || restaurant.name || humanizeSlug(slug);
  const cuisine = cuisineText(restaurant.cuisine);
  const location = restaurant.location || restaurant.address || "";
  const title = `${name} Menu and Direct Ordering`;
  const description = [
    `Order directly from ${name} on ${APP_NAME}.`,
    cuisine ? `Browse ${cuisine} menus, direct restaurant offers, schedules, and transparent pricing.` : "Browse real-time menus, direct restaurant offers, schedules, and transparent pricing.",
    location ? `Serving ${location}.` : "",
  ].filter(Boolean).join(" ");
  const image = restaurant.coverImagePath || restaurant.imagePath || restaurant.logoPath;
  const canonical = ROUTES.restaurant(slug);
  const keywords = Array.from(new Set([
    name,
    `${name} menu`,
    `${name} direct order`,
    cuisine,
    location,
    ...APP_SEO_KEYWORDS,
  ].filter((item): item is string => Boolean(item?.trim()))));

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: APP_NAME,
      type: "website",
      images: image ? [{ url: image, width: 1200, height: 630, alt: name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <CustomerShell>
      <RestaurantDetailClient slug={slug} />
    </CustomerShell>
  );
}

async function getRestaurantForMetadata(slug: string) {
  try {
    const [restaurant] = await getPublicRestaurantDocs(slug);
    return restaurant;
  } catch {
    return null;
  }
}

function cuisineText(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return typeof value === "string" ? value : "";
}

function humanizeSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
