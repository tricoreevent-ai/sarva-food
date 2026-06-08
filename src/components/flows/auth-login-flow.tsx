"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/state/form-alert";
import { useAppStore } from "@/lib/app-store";
import { defaultCmsSettings } from "@/lib/cms-defaults";
import { shouldUseFirebase } from "@/lib/env";
import { writeLocalProfile } from "@/lib/customer-address-storage";
import { DEFAULT_TENANT_ID } from "@/lib/tenant";
import { toastManager } from "@/lib/toast-manager";
import { cn } from "@/lib/utils";
import {
  completeEmailLinkLogin,
  getUserProfile,
  resetPassword,
  signInAdminWithEmail,
  signInCustomerWithEmail,
  signInOperationalWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  startEmailLinkLogin,
} from "@/services/auth-service";
import {
  getStackCustomer,
  isStackAuthConfigured,
  sendStackMagicLink,
  sendStackPasswordReset,
  signInWithStackEmail,
  signInWithStackGoogle,
  signUpWithStackEmail,
} from "@/services/auth/stack-auth-client";

type AuthSurface = "customer-login" | "customer-signup" | "portal-login" | "admin-login";
type CustomerMode = "sign-in" | "sign-up" | "forgot";

const operationalCopy = {
  "portal-login": {
    eyebrow: "Owner portal",
    title: "Owner portal login",
    description: "Restaurant operations accounts only.",
    defaultNext: "/owner",
    icon: Store,
  },
  "admin-login": {
    eyebrow: "Platform admin",
    title: "Admin sign in",
    description: "Platform controls, approvals, diagnostics, and subscriptions.",
    defaultNext: "/admin",
    icon: ShieldCheck,
  },
} as const;

export function AuthLoginFlow({ surface = "customer-login" }: { surface?: AuthSurface }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCustomerSurface = surface === "customer-login" || surface === "customer-signup";
  const defaultNext = isCustomerSurface
    ? "/"
    : operationalCopy[surface as "portal-login" | "admin-login"].defaultNext;
  const requestedNext = searchParams.get("redirect") ?? searchParams.get("next");
  const next = useMemo(() => normalizeNextPath(requestedNext, defaultNext), [defaultNext, requestedNext]);
  const phoneCompletionNext = "/profile?phoneRequired=1";
  const initialMode: CustomerMode = pathname.startsWith("/forgot-password") || searchParams.get("reset") === "true"
    ? "forgot"
    : surface === "customer-signup"
      ? "sign-up"
      : "sign-in";
  const [mode, setMode] = useState<CustomerMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authDark, setAuthDark] = useState(true);
  const [authCapabilities, setAuthCapabilities] = useState({
    ready: false,
    firebaseEnabled: false,
    stackEnabled: false,
  });
  const setAuthUser = useAppStore((state) => state.setAuthUser);
  const branding = useAppStore((state) => state.cmsSettings.branding) ?? defaultCmsSettings.branding!;
  const brandInitials = (branding.shortName || branding.appName || "SF").slice(0, 2).toUpperCase();
  const { ready: authReady, firebaseEnabled, stackEnabled } = authCapabilities;
  const passwordScore = getPasswordScore(password);
  const customerStackEnabled = isCustomerSurface && stackEnabled;
  const canSubmitPassword = customerStackEnabled || firebaseEnabled;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setAuthCapabilities({
        ready: true,
        firebaseEnabled: shouldUseFirebase(),
        stackEnabled: isStackAuthConfigured(),
      });
    }, 0);

    return () => window.clearTimeout(id);
  }, []);

  const finish = useCallback(async (target = next) => {
    if (typeof window !== "undefined") {
      window.location.replace(target);
      return;
    }
    router.replace(target);
  }, [next, router]);

  const syncStoreUser = useCallback(async (uid: string, fallback?: { displayName?: string | null; email?: string | null; photoURL?: string | null }) => {
    const profile = await getUserProfile(uid).catch(() => null);
    const fallbackRole = isCustomerSurface ? "customer" : surface === "admin-login" ? "admin" : "owner";
    const role = profile?.role ?? fallbackRole;
    const displayName = profile?.displayName ?? fallback?.displayName ?? fallback?.email ?? "Nammude Customer";
    setAuthUser({
      id: profile?.id ?? uid,
      name: displayName,
      role,
      restaurantSlug: profile?.tenantId ?? profile?.restaurantIds?.[0] ?? DEFAULT_TENANT_ID,
    });
    if (role === "customer") {
      writeLocalProfile(uid, {
        displayName,
        email: profile?.email ?? fallback?.email ?? undefined,
        phone: profile?.phone,
        photoURL: profile?.photoURL ?? fallback?.photoURL ?? undefined,
      });
    }
    return { role, phone: profile?.phone ?? "" };
  }, [isCustomerSurface, setAuthUser, surface]);

  useEffect(() => {
    if (!firebaseEnabled || !isCustomerSurface) return;
    completeEmailLinkLogin("customer")
      .then((user) => {
        if (!user) return;
        setMessage("Email verified. Opening your account...");
        toastManager.successOnce(`login-success-${user.uid}`, "Signed in with magic link.");
        void syncStoreUser(user.uid).then((syncedUser) => finish(isCustomerSurface && !syncedUser?.phone ? phoneCompletionNext : next));
      })
      .catch((error) => setMessage(friendlyAuthMessage(error)));
  }, [firebaseEnabled, finish, isCustomerSurface, next, syncStoreUser]);

  async function syncStackCustomer() {
    const user = await getStackCustomer();
    setAuthUser({
      id: user?.id || email.trim().toLowerCase() || "stack-customer",
      name: user?.displayName || name.trim() || user?.primaryEmail || "Nammude Customer",
      role: "customer",
      restaurantSlug: DEFAULT_TENANT_ID,
    });
    if (user?.id) {
      writeLocalProfile(user.id, {
        displayName: user.displayName || name.trim() || user.primaryEmail || "Nammude Customer",
        email: user.primaryEmail ?? undefined,
        photoURL: user.profileImageUrl ?? undefined,
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setMessage("");

    if (!isValidEmail(email)) {
      return setMessage("Enter a valid email address.");
    }
    if (mode !== "forgot" && password.length < 6) {
      return setMessage("Password must be at least 6 characters.");
    }
    if (mode === "sign-up" && name.trim().length < 2) {
      return setMessage("Enter your full name.");
    }
    if (mode === "sign-up" && !termsAccepted) {
      return setMessage("Accept the terms to create your account.");
    }
    if (!canSubmitPassword && mode !== "forgot") {
      return setMessage("Secure sign-in is not configured yet.");
    }

    setIsSubmitting(true);
    try {
      if (mode === "forgot") {
        await sendPasswordReset();
        return;
      }

      if (mode === "sign-up") {
        if (customerStackEnabled) {
          await signUpWithStackEmail(email.trim(), password);
          await syncStackCustomer();
        } else {
          const user = await signUpWithEmail(email.trim(), password, "customer", name.trim());
          await syncStoreUser(user.uid, { displayName: user.displayName || name.trim(), email: user.email, photoURL: user.photoURL });
        }
        toastManager.successOnce(`signup-success-${email.trim().toLowerCase()}`, "Account created.");
        await finish(isCustomerSurface ? phoneCompletionNext : next);
        return;
      }

      if (customerStackEnabled) {
        await signInWithStackEmail(email.trim(), password);
        await syncStackCustomer();
      } else {
        const user = isCustomerSurface
          ? await signInCustomerWithEmail(email.trim(), password)
          : surface === "admin-login"
            ? await signInAdminWithEmail(email.trim(), password)
            : await signInOperationalWithEmail(email.trim(), password);
        await syncStoreUser(user.uid, { displayName: user.displayName, email: user.email, photoURL: user.photoURL });
      }
      if (surface !== "portal-login") {
        toastManager.successOnce(`login-success-${email.trim().toLowerCase()}`, "Signed in.");
      }
      await finish();
    } catch (error) {
      const text = friendlyAuthMessage(error);
      setMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function sendPasswordReset() {
    const emailKey = email.trim().toLowerCase();
    const resetKey = `sarva-password-reset:${emailKey}`;
    const lastReset = Number(window.localStorage.getItem(resetKey) ?? 0);
    if (Date.now() - lastReset < 60_000) {
      setMessage("If an account exists for this email, a reset link will arrive shortly.");
      return;
    }
    setMessage("Sending reset email...");
    try {
      if (customerStackEnabled) {
        await sendStackPasswordReset(email.trim(), `${window.location.origin}/handler/password-reset`);
      } else {
        await resetPassword(email.trim());
      }
      window.localStorage.setItem(resetKey, String(Date.now()));
    } catch {
      // Keep the response generic so the reset flow cannot be used to enumerate accounts.
    }
    toastManager.successOnce(`password-reset-${emailKey}`, "If an account exists, a reset email has been sent.");
    setMessage("If an account exists for this email, a reset link will arrive shortly.");
  }

  async function sendMagicLink() {
    if (!isValidEmail(email)) {
      setMessage("Enter your email first.");
      return;
    }
    setIsSubmitting(true);
    setMessage("Sending secure magic link...");
    try {
      if (customerStackEnabled) {
        await sendStackMagicLink(email.trim(), `${window.location.origin}/handler/magic-link`);
      } else if (firebaseEnabled) {
        await startEmailLinkLogin(email.trim());
      } else {
        throw new Error("Magic link is not configured.");
      }
      toast.success("Magic link sent.");
      setMessage("Check your email for the secure sign-in link.");
    } catch (error) {
      const text = friendlyAuthMessage(error);
      setMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function continueWithGoogle() {
    setIsSubmitting(true);
    setMessage("Opening Google sign in...");
    try {
      if (!firebaseEnabled && customerStackEnabled) {
        await signInWithStackGoogle(`${window.location.origin}${phoneCompletionNext}`);
        return;
      }
      if (!firebaseEnabled) throw new Error("Google sign-in is not configured.");
      const user = await signInWithGoogle("customer");
      const syncedUser = await syncStoreUser(user.uid, { displayName: user.displayName, email: user.email, photoURL: user.photoURL });
      toastManager.successOnce(`login-success-${user.uid}`, "Signed in with Google.");
      await finish(isCustomerSurface && !syncedUser?.phone ? phoneCompletionNext : next);
    } catch (error) {
      const text = friendlyAuthMessage(error);
      setMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isCustomerSurface) {
    return (
      <OperationalLogin
        surface={surface}
        email={email}
        password={password}
        showPassword={showPassword}
        message={message}
        isSubmitting={isSubmitting}
        authReady={authReady}
        canSubmit={canSubmitPassword}
        setEmail={setEmail}
        setPassword={setPassword}
        setShowPassword={setShowPassword}
        submit={handleSubmit}
      />
    );
  }

  return (
    <main className={cn(
      "min-h-screen overflow-hidden px-4 py-5 transition-colors md:px-6 md:py-8",
      authDark ? "bg-[#071610] text-white" : "bg-[#fff8f1] text-[#1f130d]",
    )}>
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 shadow-2xl backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#032d22] p-8 lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-orange-950/60" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-emerald-500 text-base font-black text-white shadow-xl">{brandInitials}</span>
                <span>
                  <span className="block text-lg font-black">{branding.appName}</span>
                  <span className="text-xs font-semibold text-emerald-100">{branding.appDescription || "Good food, great moments"}</span>
                </span>
              </Link>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-14 max-w-sm">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-200">Customer app</p>
                <h1 className="mt-4 text-5xl font-black leading-[1.03] tracking-normal">
                  Craving something <span className="text-emerald-300">delicious?</span>
                </h1>
                <p className="mt-5 text-base font-semibold leading-7 text-emerald-50/80">
                  Sign in to reorder favourites, save addresses, unlock offers, and track every meal from restaurant to doorstep.
                </p>
              </motion.div>
              <div className="mt-8 grid gap-3">
                {[
                  ["Top restaurants", "Verified partners near you"],
                  ["Fast delivery", "Live menus and clear delivery rules"],
                  ["Secure account", "Magic link, Google, or password sign in"],
                ].map(([title, copy]) => (
                  <div key={title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                    <span className="grid size-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-200">
                      <ShieldCheck className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-black">{title}</span>
                      <span className="text-xs font-semibold text-emerald-50/70">{copy}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative mt-10 h-64 overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/10 shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80"
                alt="Fresh plated food"
                fill
                priority
                sizes="(min-width: 1024px) 420px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/50 p-4 backdrop-blur">
                <p className="text-sm font-black">New here? Get started in under a minute.</p>
                <p className="mt-1 text-xs font-semibold text-white/75">Save favourites, offers, and addresses for faster ordering.</p>
              </div>
            </div>
          </div>
        </section>

        <section className={cn("relative grid place-items-center p-4 sm:p-6 lg:p-8", authDark ? "bg-white/5" : "bg-white/70")}>
          <button
            type="button"
            onClick={() => setAuthDark((value) => !value)}
            className={cn("absolute right-4 top-4 grid size-10 place-items-center rounded-full border backdrop-blur", authDark ? "border-white/10 bg-white/10 text-white" : "border-orange-200 bg-white text-orange-700")}
            aria-label="Toggle login theme"
          >
            {authDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <motion.div layout className={cn("w-full max-w-md rounded-[1.35rem] border p-4 shadow-2xl backdrop-blur-2xl sm:p-5", authDark ? "border-white/10 bg-white/10" : "border-orange-100 bg-white/90")}>
            <div className="mb-4 flex rounded-2xl bg-black/5 p-1 text-sm font-black">
              <TabButton active={mode === "sign-in"} onClick={() => setMode("sign-in")}>Sign In</TabButton>
              <TabButton active={mode === "sign-up"} onClick={() => setMode("sign-up")}>Create Account</TabButton>
            </div>

            <div className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">
                <Sparkles className="size-3.5" />
                Secure customer login
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-normal sm:text-3xl">
                {mode === "forgot" ? "Reset your password" : mode === "sign-up" ? "Create your account" : "Welcome back"}
              </h2>
              <p className={cn("mt-2 text-sm font-semibold", authDark ? "text-white/60" : "text-muted-foreground")}>
                {mode === "forgot"
                  ? "We will send a password reset link to your email."
                  : mode === "sign-up"
                    ? "Save addresses, reorder faster, and keep your offers in one account."
                    : "Continue your food journey with password, Google, or magic link."}
              </p>
            </div>

            {mode !== "forgot" ? (
              <div className="grid gap-2">
                <Button type="button" variant="outline" className={authDark ? "border-white/10 bg-white/10 text-white hover:bg-white/15" : ""} disabled={isSubmitting || (!stackEnabled && !firebaseEnabled)} onClick={() => void continueWithGoogle()}>
                  <span className="font-black text-[#4285f4]">G</span>
                  Continue with Google
                </Button>
                <Button type="button" variant="outline" className={authDark ? "border-white/10 bg-white/10 text-white hover:bg-white/15" : ""} disabled={isSubmitting || (!stackEnabled && !firebaseEnabled)} onClick={() => void sendMagicLink()}>
                  <Mail className="size-4" />
                  Send magic link
                </Button>
              </div>
            ) : null}

            <div className={cn("my-4 flex items-center gap-3 text-xs font-bold", authDark ? "text-white/50" : "text-muted-foreground")}>
              <span className="h-px flex-1 bg-current/20" />
              {mode === "forgot" ? "reset by email" : "or continue with password"}
              <span className="h-px flex-1 bg-current/20" />
            </div>

            <form className="grid gap-3" onSubmit={handleSubmit} noValidate>
              {mode === "sign-up" ? (
                <AuthField label="Full name" htmlFor="customer-name" dark={authDark}>
                  <Input id="customer-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" autoComplete="name" className={authInputClass(authDark)} />
                </AuthField>
              ) : null}

              <AuthField label="Email address" htmlFor="customer-email" dark={authDark}>
                <Input id="customer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" className={authInputClass(authDark)} />
              </AuthField>

              {mode !== "forgot" ? (
                <AuthField label="Password" htmlFor="customer-password" dark={authDark} trailing={mode === "sign-in" ? <button type="button" className="text-xs font-black text-emerald-300" onClick={() => setMode("forgot")}>Forgot password?</button> : null}>
                  <div className="relative">
                    <Input id="customer-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "sign-up" ? "Create a password" : "Enter password"} autoComplete={mode === "sign-up" ? "new-password" : "current-password"} className={cn(authInputClass(authDark), "pr-11")} />
                    <button type="button" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-white/10" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {mode === "sign-up" ? <PasswordStrength score={passwordScore} dark={authDark} /> : null}
                </AuthField>
              ) : null}

              {mode === "sign-in" ? (
                <label className={cn("flex items-center gap-2 text-sm font-semibold", authDark ? "text-white/70" : "text-muted-foreground")}>
                  <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                  Remember me on this device
                </label>
              ) : null}

              {mode === "sign-up" ? (
                <label className={cn("flex items-start gap-2 text-xs font-semibold leading-5", authDark ? "text-white/70" : "text-muted-foreground")}>
                  <input className="mt-1" type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                  I agree to {branding.appName} terms, privacy, restaurant responsibility, and account security rules.
                </label>
              ) : null}

              <Button type="submit" size="lg" className="mt-1 w-full rounded-xl bg-gradient-to-r from-[#ff5b2e] to-[#ff7a1a] text-white shadow-xl shadow-orange-950/20" disabled={isSubmitting || !authReady}>
                {isSubmitting ? "Please wait..." : mode === "forgot" ? "Send reset email" : mode === "sign-up" ? "Create account" : "Sign in"}
                <ArrowRight className="size-5" />
              </Button>
            </form>

            {mode === "forgot" ? (
              <Button type="button" variant="ghost" className={cn("mt-3 w-full", authDark ? "text-white hover:bg-white/10" : "")} onClick={() => setMode("sign-in")}>
                Back to sign in
              </Button>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <SecurityBadge dark={authDark} label={stackEnabled ? "Stack Auth ready" : "Firebase session"} />
              <SecurityBadge dark={authDark} label={remember ? "Session persists" : "Session only"} />
            </div>

            {message ? (
              <FormAlert className="mt-4" title={messageAlertTitle(message)} message={message} tone={messageAlertTone(message)} />
            ) : null}
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function OperationalLogin({
  surface,
  email,
  password,
  showPassword,
  message,
  isSubmitting,
  authReady,
  canSubmit,
  setEmail,
  setPassword,
  setShowPassword,
  submit,
}: {
  surface: AuthSurface;
  email: string;
  password: string;
  showPassword: boolean;
  message: string;
  isSubmitting: boolean;
  authReady: boolean;
  canSubmit: boolean;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setShowPassword: (value: boolean) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const copy = operationalCopy[surface as "portal-login" | "admin-login"];
  const Icon = copy.icon;

  return (
    <main className="container-page grid min-h-screen place-items-center py-8">
      <section className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl">
        <div className="grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-black uppercase text-primary">{copy.eyebrow}</p>
        <h1 className="mt-2 text-2xl font-black">{copy.title}</h1>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{copy.description}</p>

        <form className="mt-5 grid gap-3" onSubmit={submit} noValidate>
          <AuthField label="Email" htmlFor="ops-email" dark={false}>
            <Input id="ops-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </AuthField>
          <AuthField label="Password" htmlFor="ops-password" dark={false}>
            <div className="relative">
              <Input id="ops-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" className="pr-11" />
              <button type="button" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </AuthField>
          <Button type="submit" disabled={isSubmitting || !authReady || !canSubmit}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <Link className="mt-4 inline-flex text-sm font-semibold text-primary" href="/login">
          Customer login
        </Link>
        {message ? <FormAlert className="mt-4" title={messageAlertTitle(message)} message={message} tone={messageAlertTone(message)} /> : null}
      </section>
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("h-10 flex-1 rounded-xl transition", active ? "bg-white text-[#053026] shadow-sm" : "text-white/60 hover:text-white")}
    >
      {children}
    </button>
  );
}

function AuthField({ label, htmlFor, dark, trailing, children }: { label: string; htmlFor: string; dark: boolean; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={htmlFor} className={dark ? "text-white/80" : ""}>{label}</Label>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function PasswordStrength({ score, dark }: { score: number; dark: boolean }) {
  const labels = ["Weak", "Weak", "Fair", "Good", "Strong"];
  return (
    <div className="mt-2 space-y-1">
      <div className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={cn("h-1.5 rounded-full", score >= step ? "bg-emerald-400" : dark ? "bg-white/10" : "bg-muted")} />
        ))}
      </div>
      <p className={cn("text-xs font-bold", dark ? "text-white/50" : "text-muted-foreground")}>{labels[score]} password</p>
    </div>
  );
}

function SecurityBadge({ label, dark }: { label: string; dark: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border p-2 text-xs font-black", dark ? "border-white/10 bg-white/10 text-white/70" : "bg-white text-muted-foreground")}>
      <CheckCircle2 className="size-4 text-emerald-400" />
      {label}
    </div>
  );
}

function messageAlertTone(message: string): "error" | "success" | "info" {
  if (/sent|verified|created|opening|signing|check your email/i.test(message)) return "info";
  if (/success/i.test(message)) return "success";
  return "error";
}

function messageAlertTitle(message: string) {
  const tone = messageAlertTone(message);
  if (tone === "success") return "Success";
  if (tone === "info") return "Account update";
  return "Check your details";
}

function authInputClass(dark: boolean) {
  return dark
    ? "border-white/10 bg-white/10 text-white placeholder:text-white/30 focus-visible:ring-emerald-400"
    : "bg-white";
}

function normalizeNextPath(value: string | null, fallback: string) {
  if (!value) return fallback;
  try {
    const path = decodeURIComponent(value).trim();
    if (!path.startsWith("/") || path.startsWith("//")) return fallback;
    if (/^\/(?:admin\/login|owner\/login|portal\/login|auth\/login|login|signup)(?:[/?#]|$)/i.test(path)) {
      return fallback;
    }
    return path;
  } catch {
    return fallback;
  }
}

function getPasswordScore(password: string) {
  if (!password) return 0;
  return [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function friendlyAuthMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/auth\/invalid-credential|wrong-password|user-not-found|invalid-login-credentials|mismatch/i.test(raw)) {
    return "The email or password is incorrect.";
  }
  if (/auth\/too-many-requests/i.test(raw)) return "Too many attempts. Please wait a moment and try again.";
  if (/auth\/unauthorized-domain/i.test(raw)) return "Google sign-in is not enabled for this domain.";
  if (/popup-blocked|popup-closed-by-user/i.test(raw)) return "Google sign-in popup was blocked or closed.";
  if (/operation-not-allowed/i.test(raw)) return "This sign-in method is not enabled yet.";
  if (/Secure account setup is not configured/i.test(raw)) return "Google sign-in is connected, but secure account setup is missing on this server.";
  if (/Customer profile could not be created/i.test(raw)) return "Google sign-in worked, but your customer profile could not be created. Please try again.";
  if (/not available for your account type/i.test(raw)) return "Please use the correct login screen for this account.";
  if (/network|offline|fetch/i.test(raw)) return "Connection failed. Please check internet and try again.";
  return raw && raw.length < 140 ? raw : "Authentication failed. Please check your details and try again.";
}
