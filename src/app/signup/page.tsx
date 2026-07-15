import { Suspense } from "react";
import { AuthLoginFlow } from "@/components/flows/auth-login-flow";
import { InlineLoading } from "@/components/state/page-state";
import { LazyAppToaster } from "@/components/ui/lazy-app-toaster";

export default function SignupPage() {
  return (
    <>
      <LazyAppToaster />
      <Suspense fallback={<InlineLoading label="Loading signup" />}>
        <AuthLoginFlow surface="customer-signup" />
      </Suspense>
    </>
  );
}
