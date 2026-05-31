"use client";

import { ModuleRouteError } from "@/components/runtime/module-runtime-boundary";

export default function OwnerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleRouteError module="owner" reset={reset} />;
}
