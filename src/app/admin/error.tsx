"use client";

import { PageError } from "@/components/state/page-state";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageError
      title="Admin console recovered safely"
      description="This admin view could not finish loading. Retry will reload only this module, not the whole application."
      onRetry={reset}
    />
  );
}
