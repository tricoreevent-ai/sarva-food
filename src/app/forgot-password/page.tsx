import { Suspense } from "react";
import { AuthLoginFlow } from "@/components/flows/auth-login-flow";
import { InlineLoading } from "@/components/state/page-state";
import { AppToaster } from "@/components/ui/app-toaster";

export default function ForgotPasswordPage() {
  return (
    <>
      <AppToaster />
      <Suspense fallback={<InlineLoading label="Loading password reset" />}>
        <AuthLoginFlow surface="customer-login" />
      </Suspense>
    </>
  );
}
