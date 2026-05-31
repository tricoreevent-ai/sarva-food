"use client";

import { useEffect, useState } from "react";
import { Flag, MessageSquareReply, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_RESTAURANT_ID } from "@/lib/tenant";
import type { Review } from "@/lib/types";

type Mode = "owner" | "admin";

export function ReviewManagementPanel({
  mode,
  restaurantId = DEFAULT_RESTAURANT_ID,
}: {
  mode: Mode;
  restaurantId?: string;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/public/reviews?restaurantId=${encodeURIComponent(restaurantId)}&scope=manage`, {
      headers: { Accept: "application/json", "x-sarva-surface": mode },
    })
      .then((response) => response.json())
      .then((payload: { data?: Review[]; error?: string }) => {
        if (!active) return;
        setReviews(Array.isArray(payload.data) ? payload.data : []);
        setMessage(payload.error ?? "");
      })
      .catch(() => {
        if (active) setMessage("Reviews could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mode, restaurantId]);

  async function updateReview(reviewId: string, payload: Record<string, unknown>) {
    setMessage("Updating review...");
    const response = await fetch("/api/public/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-sarva-surface": mode },
      body: JSON.stringify({ reviewId, ...payload }),
    });
    const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!response.ok || !result.ok) {
      setMessage(result.error ?? "Review update failed.");
      return;
    }
    setMessage("Review updated.");
    setReviews((current) =>
      current.map((review) => {
        if (review.id !== reviewId) return review;
        if (payload.action === "reply") {
          return {
            ...review,
            ownerReply: {
              message: String(payload.reply),
              repliedAt: new Date().toISOString(),
              repliedBy: "owner",
            },
          };
        }
        if (payload.action === "report") return { ...review, status: "reported" };
        if (payload.action === "moderate" && typeof payload.status === "string") {
          return { ...review, status: payload.status as Review["status"] };
        }
        return review;
      }),
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>{mode === "admin" ? "Review moderation" : "Customer reviews"}</CardTitle>
        <Badge variant="muted">
          <ShieldCheck className="mr-1 size-3" />
          Verified orders
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {message ? <p className="rounded-md bg-muted p-3 text-sm font-semibold text-muted-foreground">{message}</p> : null}
        {loading ? <p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">Loading reviews...</p> : null}
        {!loading && !reviews.length ? <p className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">No verified reviews yet.</p> : null}
        {reviews.slice(0, 5).map((review) => (
          <article key={review.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black">{review.customerName}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{review.menuItemName ?? "Restaurant review"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="muted">
                  <Star className="mr-1 size-3 fill-current" />
                  {review.rating}
                </Badge>
                <Badge variant={review.status === "published" ? "success" : review.status === "reported" ? "warning" : "secondary"}>
                  {review.status}
                </Badge>
              </div>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{review.comment}</p>
            {review.ownerReply ? <p className="rounded-md bg-muted p-2 text-xs font-semibold text-muted-foreground">Reply: {review.ownerReply.message}</p> : null}
            {mode === "owner" ? (
              <div className="grid gap-2">
                <Textarea
                  value={replyDrafts[review.id] ?? ""}
                  onChange={(event) => setReplyDrafts((current) => ({ ...current, [review.id]: event.target.value }))}
                  placeholder="Reply to this customer"
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => updateReview(review.id, { action: "reply", reply: replyDrafts[review.id] ?? "" })}>
                    <MessageSquareReply className="size-4" />
                    Reply
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => updateReview(review.id, { action: "report" })}>
                    <Flag className="size-4" />
                    Report abuse
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(["published", "hidden", "reported"] as const).map((status) => (
                  <Button key={status} type="button" size="sm" variant="outline" onClick={() => updateReview(review.id, { action: "moderate", status })}>
                    {status}
                  </Button>
                ))}
              </div>
            )}
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
