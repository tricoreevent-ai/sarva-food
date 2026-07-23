"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, ShieldAlert, ShieldCheck, Store } from "lucide-react";
import type { UserRole } from "@/types/firebase";

type LoginResponse = {
  ok?: boolean;
  uid?: string;
  role?: UserRole;
  tenantId?: string;
  restaurantIds?: string[];
  error?: string;
  verificationToken?: string;
};
type ResetStep = "sign-in" | "request" | "verify" | "complete";
type AlertTone = "error" | "success" | "info";

export function OwnerPortalLoginFlow() {
  const searchParams = useSearchParams();
  const next = useMemo(() => normalizeNextPath(searchParams.get("redirect") ?? searchParams.get("next"), "/owner"), [searchParams]);
  const sessionReason = searchParams.get("reason") ?? searchParams.get("timeout");
  const [step, setStep] = useState<ResetStep>("sign-in");
  const [email, setEmail] = useState(() => typeof window === "undefined" ? "" : window.localStorage.getItem("sarva.owner.login.email") ?? "");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(() => typeof window !== "undefined" && Boolean(window.localStorage.getItem("sarva.owner.login.email")));
  const [message, setMessage] = useState(sessionReason ? "Your secure owner session ended. Sign in again to continue operations." : "");
  const [tone, setTone] = useState<AlertTone>(sessionReason ? "info" : "error");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setMessage("");

    if (!isValidEmail(email)) {
      showMessage("Enter a valid owner email address.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (step === "sign-in") {
        if (password.length < 6) {
          showMessage("Enter your owner password.", "error");
          return;
        }
        const payload = await postJson("/api/owner/auth/login", { email, password });
        if (!payload.ok || !payload.uid || !payload.role) throw new Error(payload.error || "Owner sign in failed.");
        if (rememberEmail) window.localStorage.setItem("sarva.owner.login.email", email.trim());
        else window.localStorage.removeItem("sarva.owner.login.email");
        window.location.replace(next);
        return;
      }

      if (step === "request") {
        const payload = await postJson("/api/owner/auth/password-otp", { action: "request", email });
        if (!payload.ok) throw new Error(payload.error || "Could not send OTP.");
        setOtp("");
        setStep("verify");
        showMessage("OTP sent to the owner email. It expires in 10 minutes.", "info");
        return;
      }

      if (step === "verify") {
        const payload = await postJson("/api/owner/auth/password-otp", { action: "verify", email, code: otp });
        if (!payload.ok || !payload.verificationToken) throw new Error(payload.error || "OTP verification failed.");
        setVerificationToken(payload.verificationToken);
        setStep("complete");
        showMessage("OTP verified. Create a new owner password.", "success");
        return;
      }

      if (newPassword.length < 8) {
        showMessage("Password must be at least 8 characters.", "error");
        return;
      }
      if (newPassword !== confirmPassword) {
        showMessage("Both password fields must match.", "error");
        return;
      }
      const payload = await postJson("/api/owner/auth/password-otp", {
        action: "complete",
        email,
        verificationToken,
        password: newPassword,
      });
      if (!payload.ok) throw new Error(payload.error || "Could not update owner password.");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setVerificationToken("");
      setStep("sign-in");
      showMessage("Owner password updated. Sign in with the new password.", "success");
    } catch (error) {
      showMessage(friendlyError(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function showMessage(text: string, nextTone: AlertTone) {
    setMessage(text);
    setTone(nextTone);
  }

  function startReset() {
    setStep("request");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setVerificationToken("");
    setMessage("");
  }

  function backToSignIn() {
    setStep("sign-in");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setVerificationToken("");
    setMessage("");
  }

  const title = step === "sign-in" ? "Owner portal login" : "Reset owner password";
  const description = step === "sign-in"
    ? "Secure access for restaurant owners, managers, cashiers, and operations leads."
    : step === "request"
      ? "We will send a 6 digit OTP to your owner email."
      : step === "verify"
        ? "Enter the OTP sent to your owner email."
        : "Set a new password for the owner portal.";

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#1e4d34_0%,#07120d_38%,#040806_100%)] px-4 py-6 text-[#fff7e9] md:px-8">
      <div className="pointer-events-none absolute inset-x-6 top-6 h-44 rounded-full bg-emerald-300/10 blur-3xl" />
      <section className="relative mx-auto grid w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <aside className="hidden rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur lg:block">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3">
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-300 text-[#07120d]">
              <Store className="size-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">Nammude OS</p>
              <p className="text-sm font-black text-white">Enterprise restaurant command</p>
            </div>
          </div>
          <h2 className="mt-10 max-w-xl text-5xl font-black leading-[1.02] tracking-tight text-white">Run dining, kitchen, billing, and staff ops from one secure portal.</h2>
          <div className="mt-8 grid gap-3 text-sm font-bold text-emerald-50/90">
            {["Owner-grade access control", "Realtime kitchen and POS visibility", "Fast recovery for busy service hours"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                <CheckCircle2 className="size-4 text-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-[#111a12]/95 p-6 shadow-2xl backdrop-blur md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300">
              {step === "sign-in" ? <ShieldCheck className="size-6" /> : <KeyRound className="size-6" />}
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-emerald-200">Secure</span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Owner portal</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#f7e4c2]">{description}</p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <Field label="Email" htmlFor="owner-email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
              <input
                id="owner-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoFocus
                required
                className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-10 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
                placeholder="owner@example.com"
              />
            </div>
          </Field>

          {step === "sign-in" ? (
            <Field
              label="Password"
              htmlFor="owner-password"
              trailing={<button type="button" className="text-xs font-black text-emerald-300" onClick={startReset}>Forgot password?</button>}
            >
              <PasswordInput
                id="owner-password"
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((current) => !current)}
                autoComplete="current-password"
                onCapsLock={setCapsLock}
              />
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-white/70">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(event) => setRememberEmail(event.target.checked)}
                    className="size-4 rounded border-white/20 bg-white/10 accent-emerald-400"
                  />
                  Remember email
                </label>
                {capsLock ? <span className="text-xs font-black text-amber-200">Caps Lock is on</span> : null}
              </div>
            </Field>
          ) : null}

          {step === "verify" ? (
            <Field label="OTP" htmlFor="owner-otp">
              <input
                id="owner-otp"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="one-time-code"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-center text-xl font-black tracking-[0.45em] text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
                placeholder="000000"
              />
            </Field>
          ) : null}

          {step === "complete" ? (
            <>
              <Field label="New password" htmlFor="owner-new-password">
                <PasswordInput
                  id="owner-new-password"
                  value={newPassword}
                  onChange={setNewPassword}
                  visible={showNewPassword}
                  onToggle={() => setShowNewPassword((current) => !current)}
                  autoComplete="new-password"
                  onCapsLock={setCapsLock}
                />
              </Field>
              <Field label="Confirm password" htmlFor="owner-confirm-password">
                <input
                  id="owner-confirm-password"
                  type={showNewPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
                />
              </Field>
            </>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-black text-[#07120d] shadow-lg shadow-emerald-950/30 transition hover:-translate-y-0.5 hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-[#111a12] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSubmitting
              ? "Securing session..."
              : step === "sign-in"
                ? "Sign in"
                : step === "request"
                  ? "Send OTP"
                  : step === "verify"
                    ? "Verify OTP"
                    : "Update password"}
            {!isSubmitting ? <ArrowRight className="size-4" /> : null}
          </button>
        </form>

        {step !== "sign-in" ? (
          <button type="button" className="mt-4 text-sm font-black text-emerald-300" onClick={backToSignIn}>
            Back to owner login
          </button>
        ) : (
          <Link className="mt-4 inline-flex text-sm font-black text-emerald-300" href="/login">
            Customer login
          </Link>
        )}

        {message ? <InlineAlert tone={tone} message={message} /> : null}
        <p className="mt-5 flex items-center gap-2 text-xs font-bold text-white/45">
          <LockKeyhole className="size-3.5" />
          Protected by encrypted owner sessions and role-based permissions.
        </p>
      </section>
      </section>
    </main>
  );
}

function Field({ label, htmlFor, trailing, children }: { label: string; htmlFor: string; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-black text-white">{label}</label>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  onCapsLock,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  onCapsLock?: (value: boolean) => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyUp={(event) => onCapsLock?.(event.getModifierState("CapsLock"))}
        onBlur={() => onCapsLock?.(false)}
        autoComplete={autoComplete}
        required
        className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 pr-11 text-sm font-semibold text-white outline-none transition placeholder:text-white/30 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
      />
      <button type="button" className="absolute right-1 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-lg text-slate-700 hover:bg-slate-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function InlineAlert({ tone, message }: { tone: AlertTone; message: string }) {
  const styles = tone === "error"
    ? "border-red-200 bg-red-50 text-red-900"
    : tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-sky-200 bg-sky-50 text-sky-900";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mt-5 flex gap-3 rounded-xl border p-4 text-sm font-bold ${styles}`}>
      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

async function postJson(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as LoginResponse | null;
  if (!response.ok) throw new Error(payload?.error || "Request failed.");
  return payload ?? { ok: false, error: "Request failed." };
}

function normalizeNextPath(value: string | null, fallback: string) {
  if (!value) return fallback;
  try {
    const path = decodeURIComponent(value).trim();
    if (!path.startsWith("/") || path.startsWith("//")) return fallback;
    if (/^\/(?:admin\/login|owner\/login|portal\/login|auth\/login|login|signup)(?:[/?#]|$)/i.test(path)) return fallback;
    return path;
  } catch {
    return fallback;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function friendlyError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/detail.*bad request|bad request/i.test(raw)) return "The owner authentication request failed. Refresh the page and try again.";
  return raw && raw.length < 180 ? raw : "Owner authentication failed. Please check your details and try again.";
}
