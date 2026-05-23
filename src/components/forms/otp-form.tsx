"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OtpForm() {
  const [verified, setVerified] = useState(false);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setVerified(true);
      }}
    >
      <Label htmlFor="otp">Delivery OTP</Label>
      <div className="flex gap-2">
        <Input id="otp" placeholder="4 digit OTP" inputMode="numeric" maxLength={4} />
        <Button type="submit">
          <ShieldCheck className="size-4" />
          Verify
        </Button>
      </div>
      {verified ? (
        <p className="text-sm font-semibold text-success">OTP verified for wireframe handoff.</p>
      ) : null}
    </form>
  );
}
