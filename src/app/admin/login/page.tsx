import { Suspense } from "react";
import { AuthLoginFlow } from "@/components/flows/auth-login-flow";
import { InlineLoading } from "@/components/state/page-state";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<InlineLoading label="Loading admin login" />}>
      <AuthLoginFlow surface="admin-login" />
    </Suspense>
  );
}
