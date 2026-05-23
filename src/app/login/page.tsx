import { Suspense } from "react";
import { AuthLoginFlow } from "@/components/flows/auth-login-flow";
import { InlineLoading } from "@/components/state/page-state";

export default function LoginPage() {
  return (
    <Suspense fallback={<InlineLoading label="Loading sign in" />}>
      <AuthLoginFlow surface="customer-login" />
    </Suspense>
  );
}
