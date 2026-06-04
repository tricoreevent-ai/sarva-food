import { Suspense } from "react";
import { AdminPortalLoginFlow } from "@/components/flows/admin-portal-login-flow";
import { InlineLoading } from "@/components/state/page-state";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<InlineLoading label="Loading admin login" />}>
      <AdminPortalLoginFlow />
    </Suspense>
  );
}
