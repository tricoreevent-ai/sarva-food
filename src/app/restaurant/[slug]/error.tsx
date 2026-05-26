"use client";

import { PageError } from "@/components/state/page-state";

export default function RestaurantError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageError
      title="Menu could not load"
      description="The restaurant page hit a recoverable issue. Retry will reconnect menu, offers, and cart data."
      onRetry={reset}
    />
  );
}
