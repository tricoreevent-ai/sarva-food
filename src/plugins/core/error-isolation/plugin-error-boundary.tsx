"use client";

import { Component, type ReactNode } from "react";
import { getPluginLifecycleManager } from "../lifecycle/manager";

type Props = {
  pluginId: string;
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  error: Error | null;
  retryKey: number;
};

export class PluginErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    retryKey: 0,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    void getPluginLifecycleManager().recover(this.props.pluginId, error);
  }

  retry = () => {
    this.setState(({ retryKey }) => ({ error: null, retryKey: retryKey + 1 }));
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      if (process.env.NODE_ENV === "production") return null;
      return (
        <button
          type="button"
          onClick={this.retry}
          className="fixed bottom-3 left-3 z-[60] rounded-md border bg-background px-3 py-2 text-xs text-foreground shadow-sm"
        >
          Retry plugin
        </button>
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
