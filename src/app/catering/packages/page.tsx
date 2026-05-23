"use client";

import { ChefHat, Plus } from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { SectionHeader } from "@/components/layout/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";

export default function CateringPackagesPage() {
  const cateringPackages = useAppStore((state) => state.cateringPackages);
  // Screen note: Package cards provide repeatable structure for future pricing and menu attachments.
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Packages"
        description="Modular catering offers for events, corporate meals, and house parties."
        action={
          <Button>
            <Plus className="size-4" />
            Add package
          </Button>
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        {cateringPackages.length ? cateringPackages.map((pkg) => (
          <Card key={pkg.name}>
            <CardContent className="space-y-4 p-5">
              <ChefHat className="size-7 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-bold">{pkg.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{pkg.guests}</p>
              </div>
              <Badge variant="secondary">{pkg.price}</Badge>
              <div className="space-y-2">
                {pkg.inclusions.map((inclusion) => (
                  <p key={inclusion} className="rounded-md bg-muted px-3 py-2 text-sm">
                    {inclusion}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="md:col-span-3">
            <EmptyStateCard
              title="No catering packages"
              description="Create packages from Firestore-backed catering setup before publishing this page."
              actionLabel="Add package"
              actionHref="/catering/packages"
            />
          </div>
        )}
      </section>
    </div>
  );
}
