import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sarva-food.example";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/owner", "/delivery", "/pos"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
