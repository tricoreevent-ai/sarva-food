import { Suspense } from "react";
import { AuthLoginFlow } from "@/components/flows/auth-login-flow";
import { InlineLoading } from "@/components/state/page-state";

export default function SignupPage() {
  return (
    <Suspense fallback={<InlineLoading label="Loading signup" />}>
      <AuthLoginFlow surface="customer-signup" />
    </Suspense>
  );
}
