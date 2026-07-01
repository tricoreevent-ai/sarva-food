"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePhoneVerification } from "@/hooks/use-phone-verification";
import { maskPhone, type PhoneVerificationContext } from "@/lib/phone-verification";

type Props = {
  open: boolean;
  phone: string;
  context: PhoneVerificationContext;
  deviceId?: string;
  onOpenChange: (open: boolean) => void;
  onVerified: (token: string) => void;
};

export function OtpDialog({ open, phone, context, deviceId, onOpenChange, onVerified }: Props) {
  const id = useId().replace(/:/g, "");
  const [code, setCode] = useState("");
  const verification = usePhoneVerification({ phone, context, deviceId });
  const recaptchaId = `phone-recaptcha-${id}`;

  async function verify() {
    const result = await verification.confirm(code);
    if (!result) return;
    onVerified(result.token);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify mobile number</DialogTitle>
          <DialogDescription>OTP will be sent to {maskPhone(phone) || "this number"}.</DialogDescription>
        </DialogHeader>
        <div id={recaptchaId} />
        <div className="grid gap-3">
          <Button type="button" variant="outline" disabled={verification.sending || verification.cooldownSeconds > 0} onClick={() => void verification.send(recaptchaId)}>
            {verification.sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
            {verification.cooldownSeconds > 0 ? `Resend in ${verification.cooldownSeconds}s` : "Send OTP"}
          </Button>
          <label className="grid gap-1 text-sm font-semibold">
            OTP
            <input
              className="h-11 rounded-md border px-3 text-base font-semibold"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>
          {verification.error ? <p className="text-sm font-semibold text-red-600">{verification.error}</p> : null}
          <Button type="button" disabled={verification.verifying || code.length < 6} onClick={() => void verify()}>
            {verification.verifying ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Verify
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      <CheckCircle2 className="size-3.5" />
      {verified ? "Mobile verified" : "Mobile verification required"}
    </span>
  );
}
