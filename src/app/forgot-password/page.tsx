import { Suspense } from "react";
import { AuthLoginFlow } from "@/components/flows/auth-login-flow";
import { InlineLoading } from "@/components/state/page-state";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<InlineLoading label="Loading password reset" />}>
      <AuthLoginFlow surface="customer-login" />
    </Suspense>
  );
}
