import { ReactNode } from "react";
import { CustomerShellRuntime } from "@/components/layout/customer-shell-runtime";

export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <div className="customer-theme min-h-screen pb-32 md:pb-0">
      <CustomerShellRuntime>{children}</CustomerShellRuntime>
    </div>
  );
}
