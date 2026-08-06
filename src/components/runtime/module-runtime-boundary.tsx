"use client";

import { Component, Suspense, useTransition, type ReactNode } from "react";
import { ModuleLoading, PageError } from "@/components/state/page-state";
import { captureException } from "@/services/analytics-service";

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

  componentDidCatch(error: Error) {
    void captureException(error, { module: this.props.module, boundary: true });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ModuleErrorFallback module={this.props.module} onRetry={this.reset} errorId={supportErrorId(this.state.error)} />;
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
  errorId,
}: {
  module: ModuleSurface;
  onRetry: () => void;
  errorId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const copy = moduleCopy[module];

  return (
    <PageError
      title={copy.title}
      description={isPending ? "Reloading this module..." : `${copy.description}${errorId ? ` Support ID: ${errorId}.` : ""}`}
      onRetry={() => startTransition(onRetry)}
    />
  );
}

function supportErrorId(error: Error) {
  let hash = 2166136261;
  for (const char of `${error.name}:${error.message}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `FG-${(hash >>> 0).toString(36).toUpperCase()}`;
}
