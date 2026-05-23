import { Suspense } from "react";
import { AuthLoginFlow } from "@/components/flows/auth-login-flow";
import { InlineLoading } from "@/components/state/page-state";

export default function OwnerLoginPage() {
  return (
    <Suspense fallback={<InlineLoading label="Loading owner login" />}>
      <AuthLoginFlow surface="portal-login" />
    </Suspense>
  );
}
