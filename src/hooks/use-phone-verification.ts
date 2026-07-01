"use client";

import { useEffect, useMemo, useState } from "react";
import { PhoneVerificationService } from "@/services/phone-verification-service";
import { normalizeIndiaPhone, type PhoneVerificationContext } from "@/lib/phone-verification";

export function usePhoneVerification(input: { phone: string; context: PhoneVerificationContext; deviceId?: string }) {
  const service = useMemo(() => new PhoneVerificationService(), []);
  const [token, setToken] = useState({ value: "", phone: "" });
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(id);
      service.clear();
    };
  }, [service]);

  async function send(containerId: string) {
    setSending(true);
    setError("");
    try {
      const result = await service.sendOtp(input.phone, containerId);
      setNow(Date.now());
      setCooldownUntil(result.cooldownUntil);
      setExpiresAt(result.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP.");
    } finally {
      setSending(false);
    }
  }

  async function confirm(code: string) {
    setVerifying(true);
    setError("");
    try {
      const result = await service.confirmOtp(code, input);
      setNow(Date.now());
      setToken({ value: result.token, phone: normalizeIndiaPhone(input.phone) });
      setExpiresAt(Date.parse(result.expiresAt));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed.");
      return null;
    } finally {
      setVerifying(false);
    }
  }

  return {
    token: token.phone === normalizeIndiaPhone(input.phone) ? token.value : "",
    error,
    sending,
    verifying,
    send,
    confirm,
    cooldownSeconds: Math.max(0, Math.ceil((cooldownUntil - now) / 1000)),
    expiresInSeconds: Math.max(0, Math.ceil((expiresAt - now) / 1000)),
  };
}
