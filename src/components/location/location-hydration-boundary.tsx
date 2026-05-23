"use client";

import { useEffect, useState } from "react";

export function LocationHydrationBoundary({
  children,
  fallback = "Bengaluru",
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  return <>{mounted ? children : fallback}</>;
}
