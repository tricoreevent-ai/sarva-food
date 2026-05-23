import Link from "next/link";
import { WifiOff } from "lucide-react";
import { CustomerShell } from "@/components/layout/customer-shell";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants";

export default function OfflinePage() {
  // Screen note: This page is served by the service worker when navigation is offline.
  // Future Firebase integration can hydrate cached restaurant menus from IndexedDB.
  return (
    <CustomerShell>
      <main className="container-page grid min-h-[70vh] place-items-center py-10">
        <Card className="max-w-lg">
          <CardContent className="space-y-5 p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
              <WifiOff className="size-6" aria-hidden="true" />
            </div>
            <SectionHeader
              eyebrow="Offline mode"
              title="You can keep browsing cached menus"
              description="Connection dropped, but installed customers can still reopen cached restaurant and menu pages. Checkout will resume when the network returns."
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link href={ROUTES.restaurants}>Cached restaurants</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={ROUTES.home}>Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </CustomerShell>
  );
}
