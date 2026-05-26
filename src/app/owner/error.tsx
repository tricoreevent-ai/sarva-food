"use client";

import { PageError } from "@/components/state/page-state";

export default function OwnerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageError
      title="Owner dashboard needs a retry"
      description="Restaurant operations are protected by the local queue. Retry this screen without losing in-progress work."
      onRetry={reset}
    />
  );
}
