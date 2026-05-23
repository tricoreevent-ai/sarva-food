"use client";

import { SocialTemplateCard } from "@/components/studio/social-template-card";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";

export default function StudioTemplatesPage() {
  const templates = useAppStore((state) => state.templates);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Templates"
        description="Story, feed, and carousel templates for restaurant-friendly visuals."
        action={<Button variant="outline">Upload brand kit</Button>}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.length ? templates.map((template) => (
          <SocialTemplateCard key={template.id} {...template} />
        )) : (
          <div className="sm:col-span-2 xl:col-span-3">
            <EmptyStateCard
              title="No templates yet"
              description="Templates stored in Firestore will appear here."
              actionLabel="Upload brand kit"
              actionHref="/studio/templates"
            />
          </div>
        )}
      </section>
    </div>
  );
}
