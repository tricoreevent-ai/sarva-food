"use client";

import { PageError } from "@/components/state/page-state";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PageError onRetry={reset} />;
}
