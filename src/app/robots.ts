import type { MetadataRoute } from "next";
import { getRequestPublicAppUrl } from "@/lib/server/public-app-url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getRequestPublicAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/owner", "/delivery", "/pos"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
