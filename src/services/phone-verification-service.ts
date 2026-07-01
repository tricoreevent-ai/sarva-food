"use client";

import { RecaptchaVerifier, browserLocalPersistence, setPersistence, type ConfirmationResult, signInWithPhoneNumber } from "firebase/auth";
import { getFirebaseAuth } from "@/firebase/client";
import { normalizeIndiaPhone, type PhoneVerificationContext } from "@/lib/phone-verification";

export class PhoneVerificationService {
  private confirmation: ConfirmationResult | null = null;
  private verifier: RecaptchaVerifier | null = null;

  async sendOtp(phone: string, containerId: string) {
    const normalizedPhone = normalizeIndiaPhone(phone);
    if (!normalizedPhone) throw new Error("Enter a valid mobile number.");
    const auth = getFirebaseAuth();
    await setPersistence(auth, browserLocalPersistence);
    this.verifier ??= new RecaptchaVerifier(auth, containerId, { size: "invisible" });
    this.confirmation = await signInWithPhoneNumber(auth, normalizedPhone, this.verifier);
    return { phone: normalizedPhone, expiresAt: Date.now() + 10 * 60_000, cooldownUntil: Date.now() + 30_000 };
  }

  async confirmOtp(code: string, input: { phone: string; context: PhoneVerificationContext; deviceId?: string }) {
    if (!this.confirmation) throw new Error("Send OTP first.");
    const normalizedPhone = normalizeIndiaPhone(input.phone);
    const result = await this.confirmation.confirm(code);
    const idToken = await result.user.getIdToken();
    const response = await fetch("/api/auth/phone-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken, phone: normalizedPhone, context: input.context, deviceId: input.deviceId }),
    });
    const payload = await response.json().catch(() => ({})) as { data?: { token: string; phone: string; expiresAt: string }; error?: string };
    if (!response.ok || !payload.data) throw new Error(payload.error || "Mobile verification failed.");
    return payload.data;
  }

  clear() {
    this.confirmation = null;
    this.verifier?.clear();
    this.verifier = null;
  }
}
