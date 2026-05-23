"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { Card, CardContent } from "@/components/ui/card";
import { trackAnalyticsEvent } from "@/services/analytics-service";

export function InstagramDeepLinkFlow({
  restaurantSlug,
  itemId,
  offerCode,
}: {
  restaurantSlug: string;
  itemId: string;
  offerCode?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("Resolving Instagram link...");

  useEffect(() => {
    let mounted = true;

    async function resolveDeepLink() {
      if (!mounted) return;
      await trackAnalyticsEvent("instagram_link_opened", {
        restaurantSlug,
        itemId,
        offerCode: offerCode || undefined,
        source: "instagram",
      });
      setMessage("Opening the product page...");
      const query = offerCode ? `?source=instagram&offer=${encodeURIComponent(offerCode)}` : "?source=instagram";
      router.replace(
        `/restaurant/${restaurantSlug}/item/${itemId}${query}`,
      );
    }

    resolveDeepLink();

    return () => {
      mounted = false;
    };
  }, [itemId, offerCode, restaurantSlug, router]);

  return (
    <CustomerShell>
      <main className="container-page grid min-h-[70vh] place-items-center py-8">
        <Card className="max-w-md">
          <CardContent className="grid gap-4 p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent/10 text-accent">
              <Camera className="size-7" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Instagram click-to-order</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
            </div>
            <Loader2 className="mx-auto size-5 animate-spin text-primary" aria-hidden="true" />
          </CardContent>
        </Card>
      </main>
    </CustomerShell>
  );
}
