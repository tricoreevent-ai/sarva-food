import Link from "next/link";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalLoginPage() {
  return (
    <main className="container-page grid min-h-screen place-items-center py-8">
      <section className="w-full max-w-md rounded-lg border bg-card p-5 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
          <Store className="size-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-black">Owner portal login</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Restaurant operations accounts now sign in from the owner route.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/owner/login">Continue to owner login</Link>
        </Button>
      </section>
    </main>
  );
}
