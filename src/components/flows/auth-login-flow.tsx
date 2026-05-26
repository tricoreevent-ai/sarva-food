"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, Phone, RefreshCw, ShieldCheck, Store, UserRound } from "lucide-react";
import { type ConfirmationResult, type RecaptchaVerifier } from "firebase/auth";
import { SectionHeader } from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";
import { shouldEnableDevLogin, shouldUseFirebase } from "@/lib/env";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import type { MockUser } from "@/lib/types";
import {
  confirmPhoneLogin,
  completeEmailLinkLogin,
  createPhoneVerifier,
  getUserProfile,
  signInAdminWithEmail,
  signInCustomerWithEmail,
  signInOperationalWithEmail,
  signInWithGoogle,
  signOutUser,
  startEmailLinkLogin,
  startPhoneLogin,
} from "@/services/auth-service";
import type { UserRole } from "@/types/firebase";

type AuthSurface = "customer-login" | "customer-signup" | "portal-login" | "admin-login";
type EmailOtpPurpose = "signup" | "reset";
type EmailOtpStep = "email" | "verify" | "password" | "done";

type EmailOtpResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  verificationToken?: string;
  resendAfterSeconds?: number;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
  workaround?: string;
};

const DEV_USERS: Array<MockUser & { email: string; password: string }> = [
  { id: "demo-customer", name: "Demo Customer", role: "customer", restaurantSlug: DEFAULT_TENANT_ID, email: "demo@sarva.test", password: "password123" },
  { id: "test-owner", name: "Test Owner", role: "owner", restaurantSlug: DEFAULT_TENANT_ID, email: "owner@sarva.test", password: "password123" },
  { id: "test-manager", name: "Test Manager", role: "manager", restaurantSlug: DEFAULT_TENANT_ID, email: "manager@sarva.test", password: "password123" },
  { id: "test-cashier", name: "Test Cashier", role: "cashier", restaurantSlug: DEFAULT_TENANT_ID, email: "cashier@sarva.test", password: "password123" },
  { id: "test-chef", name: "Test Chef", role: "chef", restaurantSlug: DEFAULT_TENANT_ID, email: "chef@sarva.test", password: "password123" },
  { id: "test-waiter", name: "Test Waiter", role: "waiter", restaurantSlug: DEFAULT_TENANT_ID, email: "waiter@sarva.test", password: "password123" },
  { id: "test-delivery", name: "Test Delivery Partner", role: "delivery-staff", restaurantSlug: DEFAULT_TENANT_ID, email: "delivery@sarva.test", password: "password123" },
  { id: "test-admin", name: "Platform Admin", role: "admin", restaurantSlug: DEFAULT_TENANT_ID, email: "admin@sarva.test", password: "password123" },
];

const portalRoles: UserRole[] = [
  "owner",
  "manager",
  "cashier",
  "chef",
  "kitchen-manager",
  "waiter",
  "accountant",
  "inventory-manager",
  "delivery-staff",
  "delivery",
];

const surfaceCopy: Record<AuthSurface, {
  eyebrow: string;
  title: string;
  description: string;
  defaultNext: string;
  icon: typeof UserRound;
}> = {
  "customer-login": {
    eyebrow: "Customer access",
    title: "Sign in to order",
    description: "Use your customer account to manage addresses, order history, and loyalty across Sarva restaurants.",
    defaultNext: "/profile",
    icon: UserRound,
  },
  "customer-signup": {
    eyebrow: "Customer signup",
    title: "Create your customer account",
    description: "Sign up with email and password. We will send a verification link before your profile is fully active.",
    defaultNext: "/profile",
    icon: UserRound,
  },
  "portal-login": {
    eyebrow: "Owner portal",
    title: "Owner portal login",
    description: "For restaurant operations accounts only. Customer accounts use the public login.",
    defaultNext: "/owner",
    icon: Store,
  },
  "admin-login": {
    eyebrow: "Platform admin",
    title: "Admin sign in",
    description: "Platform-level access for tenant onboarding, approvals, audit, and subscription operations.",
    defaultNext: "/admin",
    icon: ShieldCheck,
  },
};

export function AuthLoginFlow({ surface = "customer-login" }: { surface?: AuthSurface }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? surfaceCopy[surface].defaultNext;
  const resetRequested = searchParams.get("reset") === "true" || searchParams.get("mode") === "reset";
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const isCustomerSurface = surface === "customer-login" || surface === "customer-signup";
  const isSignup = surface === "customer-signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailOtpPurpose, setEmailOtpPurpose] = useState<EmailOtpPurpose>(isSignup ? "signup" : "reset");
  const [emailOtpStep, setEmailOtpStep] = useState<EmailOtpStep>(isSignup ? "email" : "email");
  const [emailOtpToken, setEmailOtpToken] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [showResetOtp, setShowResetOtp] = useState(resetRequested && isCustomerSurface && !isSignup);
  const [authCapabilities, setAuthCapabilities] = useState({
    ready: false,
    firebaseEnabled: false,
    devLoginEnabled: false,
  });
  const setAuthUser = useAppStore((state) => state.setAuthUser);

  const { ready: authCapabilitiesReady, firebaseEnabled, devLoginEnabled } = authCapabilities;
  const copy = surfaceCopy[surface];
  const Icon = copy.icon;
  const devUsers = useMemo(() => {
    if (surface === "admin-login") return DEV_USERS.filter((user) => user.role === "admin");
    if (surface === "portal-login") return DEV_USERS.filter((user) => portalRoles.includes(user.role));
    if (surface === "customer-login") return DEV_USERS.filter((user) => user.role === "customer");
    return [];
  }, [surface]);
  const matchingDevUser = useMemo(
    () => devUsers.find((user) => user.email.toLowerCase() === email.trim().toLowerCase() && user.password === password),
    [devUsers, email, password],
  );
  const canUsePasswordAuth = firebaseEnabled || devLoginEnabled;
  useEffect(() => {
    const id = window.setTimeout(() => {
      setAuthCapabilities({
        ready: true,
        firebaseEnabled: shouldUseFirebase(),
        devLoginEnabled: shouldEnableDevLogin(),
      });
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendSeconds]);

  const finish = useCallback(async () => {
    router.replace(next);
    router.refresh();
  }, [next, router]);

  const finishWithFallback = useCallback(async () => {
    await finish();
    window.setTimeout(() => {
      const target = new URL(next, window.location.origin);
      if (window.location.pathname.includes("/login") && target.pathname !== window.location.pathname) {
        window.location.assign(target.href);
      }
    }, 300);
  }, [finish, next]);

  useEffect(() => {
    if (!firebaseEnabled || !isCustomerSurface) return;
    completeEmailLinkLogin("customer")
      .then((user) => {
        if (user) {
          setMessage("Email verified. Completing sign in...");
          void finish();
        }
      })
      .catch((error) => {
        setMessage(friendlyAuthMessage(error));
      });
  }, [firebaseEnabled, finish, isCustomerSurface]);

  async function callEmailOtpApi(payload: {
    action: "request" | "verify" | "complete";
    purpose: EmailOtpPurpose;
    email: string;
    code?: string;
    verificationToken?: string;
    password?: string;
    displayName?: string;
  }) {
    try {
      const response = await fetch("/api/auth/email-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({})) as EmailOtpResponse;
      return response.ok && data.ok !== false
        ? data
        : { ok: false, error: data.error ?? safeEmailOtpMessage(payload.action), code: data.code, retryAfterSeconds: data.retryAfterSeconds, attemptsRemaining: data.attemptsRemaining };
    } catch {
      return { ok: false, error: safeEmailOtpMessage(payload.action), code: "network" };
    }
  }

  async function sendEmailOtp(purpose: EmailOtpPurpose = emailOtpPurpose) {
    if (!email.trim()) {
      setMessage("Enter your email first.");
      return;
    }
    if (purpose === "signup" && name.trim().length < 2) {
      setMessage("Enter your name before creating an account.");
      return;
    }
    setIsSubmitting(true);
    setEmailOtpPurpose(purpose);
    setMessage("Sending OTP...");
    const data = await callEmailOtpApi({ action: "request", purpose, email });
    if (data.ok === false) {
      setAttemptsRemaining(data.attemptsRemaining ?? null);
      setResendSeconds(data.retryAfterSeconds ?? 0);
      setMessage(data.error ?? safeEmailOtpMessage("request"));
      setIsSubmitting(false);
      return;
    }
    setEmailOtpStep("verify");
    setOtp("");
    setAttemptsRemaining(data.attemptsRemaining ?? null);
    setResendSeconds(data.resendAfterSeconds ?? 60);
    setMessage(`OTP sent to ${email.trim().toLowerCase()}.`);
    setIsSubmitting(false);
  }

  async function verifyEmailOtp() {
    setIsSubmitting(true);
    setMessage("Verifying OTP...");
    const data = await callEmailOtpApi({
      action: "verify",
      purpose: emailOtpPurpose,
      email,
      code: otp,
    });
    if (data.ok === false) {
      setAttemptsRemaining(data.attemptsRemaining ?? attemptsRemaining);
      setMessage(data.error ?? safeEmailOtpMessage("verify"));
      setIsSubmitting(false);
      return;
    }
    setEmailOtpToken(data.verificationToken ?? "");
    setEmailOtpStep("password");
    setMessage("Email verified. Set your password to continue.");
    setIsSubmitting(false);
  }

  async function completeEmailOtp() {
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    setIsSubmitting(true);
    setMessage(emailOtpPurpose === "signup" ? "Creating account..." : "Updating password...");
    const data = await callEmailOtpApi({
      action: "complete",
      purpose: emailOtpPurpose,
      email,
      verificationToken: emailOtpToken,
      password,
      displayName: name,
    });
    if (data.ok === false) {
      setMessage(data.error ?? safeEmailOtpMessage("complete"));
      setIsSubmitting(false);
      return;
    }
    setEmailOtpStep("done");
    setMessage(emailOtpPurpose === "signup" ? "Account created. Signing you in..." : "Password updated. Signing you in...");
    if (firebaseEnabled) {
      try {
        const user = await signInCustomerWithEmail(email, password);
        await syncStoreUser(user.uid);
        await finish();
      } catch {
        setMessage("Account updated. Please sign in with your new password.");
      }
    }
    setIsSubmitting(false);
  }

  function friendlyAuthMessage(error: unknown) {
    const raw = error instanceof Error ? error.message : "";
    if (/auth\/invalid-credential|wrong-password|user-not-found|invalid-login-credentials/i.test(raw)) {
      return "The email or password is incorrect.";
    }
    if (/auth\/too-many-requests/i.test(raw)) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (/auth\/unauthorized-domain/i.test(raw)) {
      return "Google sign-in is not enabled for this domain. Add this domain in Firebase Authentication authorized domains.";
    }
    if (/auth\/popup-blocked|auth\/popup-closed-by-user/i.test(raw)) {
      return "Google sign-in popup was blocked or closed. Allow popups for this site and try again.";
    }
    if (/auth\/operation-not-allowed/i.test(raw)) {
      return "Google sign-in is not enabled in Firebase Authentication.";
    }
    if (/not available for your account type/i.test(raw)) {
      return "Please use the correct login screen for this account.";
    }
    if (/inactive|approved/i.test(raw)) {
      return "This account is inactive or waiting for approval.";
    }
    if (/network|offline/i.test(raw)) {
      return "You appear to be offline. We will keep local work saved and retry when internet returns.";
    }
    return "Authentication failed. Please check your details and try again.";
  }

  function safeEmailOtpMessage(action: "request" | "verify" | "complete") {
    if (action === "request") return "Unable to send OTP right now. Please try again later.";
    if (action === "verify") return "Invalid or expired OTP. Please check the code and try again.";
    return "Unable to complete this account update right now. Please try again later.";
  }

  async function withErrorBoundary(action: () => Promise<void>, success?: string, redirect = true) {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setMessage(isSignup ? "Creating account..." : "Signing in...");
      await action();
      setMessage(success ?? (isSignup ? "Account created. Check your email for the verification link." : "Signed in."));
      if (redirect) {
        await finish();
      }
    } catch (error) {
      if (devLoginEnabled && matchingDevUser) {
        await signInAsDevUser(matchingDevUser);
        return;
      }
      setMessage(friendlyAuthMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithConfiguredSurface() {
    if (devLoginEnabled && matchingDevUser) {
      await signInAsDevUser(matchingDevUser);
      return;
    }

    if (!firebaseEnabled) {
      throw new Error("Secure sign-in is not configured. Use a local development account or enable Firebase.");
    }

    if (surface === "admin-login") {
      const user = await signInAdminWithEmail(email, password);
      await syncStoreUser(user.uid);
      return;
    }

    if (surface === "portal-login") {
      const user = await signInOperationalWithEmail(email, password);
      await syncStoreUser(user.uid);
      return;
    }

    const user = await signInCustomerWithEmail(email, password);
    await syncStoreUser(user.uid);
  }

  async function syncStoreUser(uid: string) {
    const profile = await getUserProfile(uid).catch(() => null);
    if (!profile) return;
    setAuthUser({
      id: profile.id,
      name: profile.displayName,
      role: profile.role,
      restaurantSlug: profile.tenantId ?? profile.restaurantIds?.[0] ?? DEFAULT_TENANT_ID,
    });
  }

  async function signInAsDevUser(devUser: (typeof DEV_USERS)[number]) {
    try {
      setIsSubmitting(true);
      setEmail(devUser.email);
      setPassword(devUser.password);
      setName(devUser.name);
      await signOutUser().catch(() => undefined);
      await fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);

      const sessionResponse = await fetch("/api/auth/test-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid: devUser.id, role: devUser.role }),
      }).catch(() => null);

      const savedOwnerName = devUser.role === "owner" ? useAppStore.getState().ownerBusinessProfile?.ownerName : undefined;
      const displayName = savedOwnerName || devUser.name;
      setAuthUser({
        id: devUser.id,
        name: displayName,
        role: devUser.role,
        restaurantSlug: devUser.restaurantSlug,
      });
      setMessage(
        sessionResponse?.ok === false
          ? `Signed in locally as ${displayName}. Restart the dev server if this page does not open.`
          : `Signed in as ${displayName}.`,
      );
      await finishWithFallback();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPasswordForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!canUsePasswordAuth) {
      setMessage("Secure sign-in is still preparing. Please try again in a moment.");
      return;
    }
    if (!email.trim() || password.length < 6) {
      setMessage("Enter a valid email and password.");
      return;
    }
    if (isSignup && name.trim().length < 2) {
      setMessage("Enter your name before creating an account.");
      return;
    }

    await withErrorBoundary(signInWithConfiguredSurface);
  }

  return (
    <main className="container-page grid min-h-screen place-items-center py-8">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-5">
          <div className="grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-6" aria-hidden="true" />
          </div>
          <SectionHeader
            eyebrow={copy.eyebrow}
            title={copy.title}
            description={copy.description}
          />

          {!authCapabilitiesReady ? (
            <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
              Preparing secure sign-in...
            </div>
          ) : null}

          {authCapabilitiesReady && devLoginEnabled && devUsers.length ? (
            <div className="grid gap-2 rounded-md bg-primary/10 p-3 text-sm">
              <p className="font-bold text-primary">Development login</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {devUsers.map((devUser) => (
                  <Button
                    key={devUser.email}
                    variant="outline"
                    size="sm"
                    className="justify-start bg-background"
                    onClick={() => void signInAsDevUser(devUser)}
                  >
                    <KeyRound className="size-3" />
                    {devUser.role}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Local development only. Password for all accounts is password123.
              </p>
            </div>
          ) : null}

          {authCapabilitiesReady && !firebaseEnabled && !devLoginEnabled ? (
            <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
              Secure sign-in is temporarily unavailable. Please try again soon.
            </div>
          ) : null}

          {isSignup || showResetOtp ? (
            <div className="grid gap-3">
              {isSignup ? (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="email-otp-email">Email</Label>
                <Input
                  id="email-otp-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  disabled={emailOtpStep !== "email"}
                />
              </div>
              {emailOtpStep === "email" ? (
                <Button
                  type="button"
                  disabled={!firebaseEnabled || isSubmitting || !email.trim() || (isSignup && name.trim().length < 2)}
                  onClick={() => void sendEmailOtp(isSignup ? "signup" : "reset")}
                >
                  <Mail className="size-4" />
                  {isSubmitting ? "Sending OTP..." : "Send email OTP"}
                </Button>
              ) : null}
              {emailOtpStep === "verify" ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="email-otp">Email OTP</Label>
                    <Input
                      id="email-otp"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6 digit code"
                    />
                    {attemptsRemaining !== null ? (
                      <p className="text-xs font-semibold text-muted-foreground">{attemptsRemaining} attempts remaining</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" disabled={isSubmitting || otp.length !== 6} onClick={() => void verifyEmailOtp()}>
                      {isSubmitting ? "Verifying..." : "Verify OTP"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting || resendSeconds > 0}
                      onClick={() => void sendEmailOtp(emailOtpPurpose)}
                    >
                      <RefreshCw className="size-4" />
                      {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
                    </Button>
                  </div>
                </>
              ) : null}
              {emailOtpStep === "password" ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="email-otp-password">{emailOtpPurpose === "signup" ? "Set password" : "New password"}</Label>
                    <div className="relative">
                      <Input
                        id="email-otp-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="new-password"
                        className="pr-11"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="button" disabled={isSubmitting || password.length < 8} onClick={() => void completeEmailOtp()}>
                    {emailOtpPurpose === "signup" ? "Create account" : "Set new password"}
                  </Button>
                </>
              ) : null}
              {emailOtpStep === "done" ? (
                <div className="rounded-md border bg-muted p-3 text-sm font-semibold">
                  {emailOtpPurpose === "signup" ? "Account created." : "Password updated."}
                </div>
              ) : null}
              {showResetOtp ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowResetOtp(false);
                    setEmailOtpStep("email");
                    setEmailOtpToken("");
                    setOtp("");
                    setPassword("");
                    setMessage("");
                  }}
                >
                  Back to sign in
                </Button>
              ) : null}
            </div>
          ) : (
            <form className="grid gap-3" onSubmit={submitPasswordForm} noValidate>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || !canUsePasswordAuth}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
              {isCustomerSurface ? (
                <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!firebaseEnabled}
                  onClick={async () => {
                    try {
                      setMessage("Sending secure link...");
                      await startEmailLinkLogin(email);
                      setMessage("Check your email for the secure sign-in link.");
                    } catch {
                      setMessage("Unable to send the secure link right now. Please try again later.");
                    }
                  }}
                >
                  <Mail className="size-4" />
                  Email magic link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!firebaseEnabled || !email.trim()}
                  onClick={() => {
                    setEmailOtpPurpose("reset");
                    setEmailOtpStep("email");
                    setShowResetOtp(true);
                    setPassword("");
                    setOtp("");
                    setMessage("Enter your email to receive a reset OTP.");
                  }}
                >
                  Forgot password
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!firebaseEnabled}
                  onClick={() => withErrorBoundary(async () => {
                    const user = await signInWithGoogle("customer");
                    await syncStoreUser(user.uid);
                  })}
                >
                  <ShieldCheck className="size-4" />
                  Continue with Google
                </Button>
                </>
              ) : null}
            </form>
          )}

          {isCustomerSurface && !isSignup && !showResetOtp ? (
            <div className="grid gap-3">
              <div id="sarva-phone-recaptcha" />
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone optional</Label>
                <Input
                  id="phone"
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              {confirmation ? (
                <div className="grid gap-2">
                  <Label htmlFor="otp">OTP</Label>
                  <Input id="otp" value={otp} onChange={(event) => setOtp(event.target.value)} />
                </div>
              ) : null}
              <Button
                variant="secondary"
                disabled={!firebaseEnabled}
                onClick={() =>
                  withErrorBoundary(async () => {
                    if (!confirmation) {
                      verifier.current ??= createPhoneVerifier("sarva-phone-recaptcha");
                      setConfirmation(await startPhoneLogin(phone, verifier.current));
                      setMessage("OTP sent.");
                      return;
                    }
                    await confirmPhoneLogin(confirmation, otp, "customer");
                  })
                }
              >
                <Phone className="size-4" />
                {confirmation ? "Verify OTP" : "Send OTP"}
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {surface === "customer-login" ? (
              <Link className="font-semibold text-primary" href="/signup">Create a customer account</Link>
            ) : null}
            {surface === "customer-signup" ? (
              <Link className="font-semibold text-primary" href="/login">Already have an account?</Link>
            ) : null}
            {!isCustomerSurface ? (
              <Link className="font-semibold text-primary" href="/login">Customer login</Link>
            ) : null}
          </div>

          {message ? <p className="text-sm font-semibold text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
