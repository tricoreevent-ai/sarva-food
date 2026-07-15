"use client";

import dynamic from "next/dynamic";

export const LazyAppToaster = dynamic(
  () => import("@/components/ui/app-toaster").then((module) => module.AppToaster),
  { ssr: false },
);
