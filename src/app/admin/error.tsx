"use client";

import { ModuleRouteError } from "@/components/runtime/module-runtime-boundary";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleRouteError module="admin" reset={reset} />;
}
