"use client";

import { StackClientApp } from "@stackframe/stack";

type StackUserSummary = {
  id?: string;
  primaryEmail?: string | null;
  displayName?: string | null;
  profileImageUrl?: string | null;
};

let stackApp: InstanceType<typeof StackClientApp> | null = null;

export function isStackAuthConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_STACK_PROJECT_ID?.trim() &&
    process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY?.trim(),
  );
}

export function getStackAuthApp() {
  if (!isStackAuthConfigured()) {
    throw new Error("Stack Auth is not configured for this environment.");
  }

  stackApp ??= new StackClientApp({
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
    baseUrl: process.env.NEXT_PUBLIC_STACK_BASE_URL || undefined,
    tokenStore: "cookie",
    redirectMethod: "window",
    devTool: false,
    noAutomaticPrefetch: true,
  });

  return stackApp;
}

export async function signInWithStackEmail(email: string, password: string) {
  const app = getStackAuthApp();
  const result = await app.signInWithCredential({ email, password, noRedirect: true });
  assertStackResult(result, "Could not sign in with Stack Auth.");
  return getStackCustomer();
}

export async function signUpWithStackEmail(email: string, password: string) {
  const app = getStackAuthApp();
  const result = await app.signUpWithCredential({
    email,
    password,
    noRedirect: true,
    noVerificationCallback: true,
  });
  assertStackResult(result, "Could not create your Stack Auth account.");
  return getStackCustomer();
}

export async function sendStackMagicLink(email: string, callbackUrl: string) {
  const result = await getStackAuthApp().sendMagicLinkEmail(email, { callbackUrl });
  assertStackResult(result, "Could not send magic link.");
}

export async function sendStackPasswordReset(email: string, callbackUrl: string) {
  const result = await getStackAuthApp().sendForgotPasswordEmail(email, { callbackUrl });
  assertStackResult(result, "Could not send password reset email.");
}

export async function signInWithStackGoogle(returnTo: string) {
  await getStackAuthApp().signInWithOAuth("google", { returnTo });
}

export async function signOutStackCustomer() {
  if (!isStackAuthConfigured()) return;
  await getStackAuthApp().signOut();
}

export async function getStackCustomer(): Promise<StackUserSummary | null> {
  const user = await getStackAuthApp().getUser().catch(() => null);
  if (!user) return null;
  return {
    id: String(user.id),
    primaryEmail: user.primaryEmail,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
  };
}

function assertStackResult(result: { status: string; error?: unknown }, fallback: string) {
  if (result.status !== "ok") {
    throw new Error(stackErrorMessage(result.error) || fallback);
  }
}

function stackErrorMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const maybe = error as { message?: unknown; name?: unknown };
  return typeof maybe.message === "string" ? maybe.message : typeof maybe.name === "string" ? maybe.name : "";
}
