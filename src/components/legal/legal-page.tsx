"use client";

import { CustomerShell } from "@/components/layout/customer-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { legalContentToHtml } from "@/lib/legal-content";
import type { CmsSettings } from "@/lib/types";

type LegalKey = keyof CmsSettings["legalPages"];

export function LegalPage({ title, pageKey }: { title: string; pageKey: LegalKey }) {
  const cmsSettings = useAppStore((state) => state.cmsSettings) ?? defaultCmsSettings;
  const text = cmsSettings.legalPages?.[pageKey] || defaultCmsSettings.legalPages[pageKey] || defaultCmsSettings.disclaimer;

  return (
    <CustomerShell>
      <main className="container-page py-8">
        <Card className="customer-surface">
          <CardContent className="prose prose-sm max-w-none p-6">
            <h1>{title}</h1>
            <div dangerouslySetInnerHTML={{ __html: legalContentToHtml(String(text)) }} />
          </CardContent>
        </Card>
      </main>
    </CustomerShell>
  );
}
