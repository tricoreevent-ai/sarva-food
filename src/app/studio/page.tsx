"use client";

import Link from "next/link";
import { CalendarClock, ImagePlus, Wand2 } from "lucide-react";
import { EmptyStateCard } from "@/components/layout/empty-state";
import { PostPreviewCard } from "@/components/studio/post-preview-card";
import { SocialTemplateCard } from "@/components/studio/social-template-card";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/lib/app-store";

export default function StudioPage() {
  const menuItems = useAppStore((state) => state.menuItems);
  const templates = useAppStore((state) => state.templates);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section className="space-y-6">
        <SectionHeader
          title="Marketing studio"
          description="Upload food images, choose templates, edit text, preview, generate, and schedule social posts."
          action={
            <Button asChild>
              <Link href="/studio/create-post">
                <Wand2 className="size-4" />
                Create post
              </Link>
            </Button>
          }
        />
        {templates.length ? <div className="grid gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <SocialTemplateCard key={template.id} {...template} />
          ))}
        </div> : (
          <EmptyStateCard
            title="No social templates"
            description="Create Firestore-backed templates before scheduling marketing posts."
            actionLabel="Create template"
            actionHref="/studio/templates"
          />
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Generate Instagram story", icon: ImagePlus, href: "/studio/create-post" },
            { label: "Schedule feed post", icon: CalendarClock, href: "/studio/scheduled-posts" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Card key={action.label}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-md bg-accent/10 text-accent">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <h2 className="font-bold">{action.label}</h2>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={action.href}>Open</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
      {menuItems[0] ? (
        <PostPreviewCard image={menuItems[0].image} title={menuItems[0].name} subtitle="Tap story to order now" />
      ) : (
        <EmptyStateCard
          title="No menu images"
          description="Add menu items with images to preview social posts."
          actionLabel="Manage menu"
          actionHref="/owner/menu"
        />
      )}
    </div>
  );
}
