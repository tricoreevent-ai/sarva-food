"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/hooks/auth/use-customer-auth";

export function ProtectedCustomerRoute({ children }: { children: React.ReactNode }) {
  const { signedIn } = useCustomerAuth();

  if (signedIn) return <>{children}</>;

  return (
    <main className="grid min-h-[60vh] place-items-center px-4">
      <section className="max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <LockKeyhole className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-black">Sign in required</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">
          Sign in with your customer account to continue.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/login">Open customer login</Link>
        </Button>
      </section>
    </main>
  );
}
