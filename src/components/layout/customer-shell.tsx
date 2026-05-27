import { ReactNode } from "react";
import { CustomerShellClient } from "@/components/layout/customer-shell-client";

export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <div className="customer-theme customer-light min-h-screen pb-32 md:pb-0">
      <CustomerShellClient>{children}</CustomerShellClient>
    </div>
  );
}
