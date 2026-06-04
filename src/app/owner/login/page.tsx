import { Suspense } from "react";
import { OwnerPortalLoginFlow } from "@/components/flows/owner-portal-login-flow";
import { InlineLoading } from "@/components/state/page-state";

export default function OwnerLoginPage() {
  return (
    <Suspense fallback={<InlineLoading label="Loading owner login" />}>
      <OwnerPortalLoginFlow />
    </Suspense>
  );
}
