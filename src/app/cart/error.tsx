"use client";

import { ModuleRouteError } from "@/components/runtime/module-runtime-boundary";

export default function CartError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModuleRouteError module="customer" reset={reset} />;
}
