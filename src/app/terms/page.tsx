"use client";

import { CustomerShell } from "@/components/layout/customer-shell";
import { ResponsibilityDisclaimer } from "@/components/legal/responsibility-disclaimer";
import { SectionHeader } from "@/components/layout/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";

export default function TermsPage() {
  const cmsSettings = useAppStore((state) => state.cmsSettings) ?? defaultCmsSettings;

  return (
    <CustomerShell>
      <main className="container-page space-y-5 py-6">
        <SectionHeader
          title="Terms and responsibility"
          description="Platform terms, restaurant responsibility, and customer safety information."
        />
        <Card className="customer-surface">
          <CardContent className="space-y-4 p-5 leading-7 text-slate-700">
            <h2 className="text-xl font-black text-slate-950">Legal terms</h2>
            <p>{cmsSettings.legalPages?.terms || defaultCmsSettings.legalPages.terms}</p>
          </CardContent>
        </Card>
        <ResponsibilityDisclaimer />
      </main>
    </CustomerShell>
  );
}
