"use client";

import { Component, Suspense, useEffect, useTransition, type ReactNode } from "react";
import { ModuleLoading, OwnerLoadingScreen, PageError } from "@/components/state/page-state";

export type ModuleSurface = "customer" | "owner" | "admin";

type BoundaryProps = {
  children: ReactNode;
  module: ModuleSurface;
};

type BoundaryState = {
  error: Error | null;
};

const moduleCopy: Record<ModuleSurface, { title: string; description: string }> = {
  customer: {
    title: "We could not load this page",
    description: "Please retry. Your cart and account actions are kept safe while this customer page reloads.",
  },
  owner: {
    title: "Owner dashboard needs a retry",
    description: "Restaurant operations are isolated from the customer and admin apps. Retry only this owner screen.",
  },
  admin: {
    title: "Admin console recovered safely",
    description: "This admin view could not finish loading. Retry will reload only the admin module.",
  },
};

class ModuleCrashBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ModuleErrorFallback module={this.props.module} onRetry={this.reset} />;
    }

    return this.props.children;
  }
}

export function ModuleRuntimeBoundary({ children, module }: BoundaryProps) {
  return (
    <ModuleCrashBoundary module={module}>
      <Suspense fallback={<ModuleLoading module={module} />}>
        {children}
      </Suspense>
    </ModuleCrashBoundary>
  );
}

export function ModuleRouteError({
  module,
  reset,
}: {
  module: ModuleSurface;
  reset: () => void;
}) {
  return <ModuleErrorFallback module={module} onRetry={reset} />;
}

function ModuleErrorFallback({
  module,
  onRetry,
}: {
  module: ModuleSurface;
  onRetry: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const copy = moduleCopy[module];

  useEffect(() => {
    if (module !== "owner") return;
    const timer = window.setTimeout(() => startTransition(onRetry), 1200);
    return () => window.clearTimeout(timer);
  }, [module, onRetry]);

  if (module === "owner") {
    return <OwnerLoadingScreen label={isPending ? "Loading....." : "Loading....."} />;
  }

  return (
    <PageError
      title={copy.title}
      description={isPending ? "Reloading this module..." : copy.description}
      onRetry={() => startTransition(onRetry)}
    />
  );
}
