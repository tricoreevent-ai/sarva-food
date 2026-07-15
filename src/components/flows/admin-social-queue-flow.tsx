"use client";

import { CheckCircle2, Clock3, Send, XCircle } from "lucide-react";
import { SectionHeader } from "@/components/layout/section-header";
import { IMAGE_FALLBACKS, SafeImage } from "@/components/media/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminRepositoryData } from "@/hooks/use-admin-repository-data";

export function AdminSocialQueueFlow() {
  const { socialPosts: posts, reviewSocialPost } = useAdminRepositoryData();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Social approval queue"
        description="Owners submit promotional content. Admin approves and publishes from official Nammude Instagram and Facebook accounts."
        action={<Badge variant="warning">{posts.filter((post) => post.status === "pending").length} pending</Badge>}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                <SafeImage src={post.foodImage} alt={post.headline} fill fallbackSrc={IMAGE_FALLBACKS.food} cloudinaryPreset="cart" sizes="160px" className="object-cover" />
              </div>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={post.status === "rejected" ? "destructive" : post.status === "published" ? "success" : post.status === "approved" ? "default" : "warning"}>
                    {post.status}
                  </Badge>
                  <Badge variant="muted">{post.locationTag}</Badge>
                  {post.scheduledAt ? <Badge variant="outline">{post.scheduledAt}</Badge> : null}
                </div>
                <div>
                  <h2 className="text-lg font-black">{post.headline}</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{post.caption}</p>
                  <p className="mt-2 text-sm font-bold">{post.offerCode} · {post.cta}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => reviewSocialPost(post.id, "approved", "Approved for official publishing.")}>
                    <CheckCircle2 className="size-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => reviewSocialPost(post.id, "published", "Published from Nammude official Meta accounts.")}>
                    <Send className="size-4" />
                    Publish
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reviewSocialPost(post.id, "rejected", "Needs clearer offer copy or image.")}>
                    <XCircle className="size-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card>
        <CardContent className="flex items-start gap-3 p-5">
          <Clock3 className="mt-1 size-5 text-primary" />
          <p className="text-sm leading-6 text-muted-foreground">
            Approved posts remain in the publish queue until admin sends them through configured Meta accounts. Scheduled posts keep their requested local publish time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
