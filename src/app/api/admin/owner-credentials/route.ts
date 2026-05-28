import crypto from "node:crypto";
import nodemailer, { type TransportOptions } from "nodemailer";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/firebase/admin";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type OwnerCredentialRequest = {
  action?: "create-owner" | "reset-password" | "send-credentials" | "toggle-login";
  email?: string;
  ownerName?: string;
  restaurantSlug?: string;
  restaurantName?: string;
  branchId?: string;
  loginEnabled?: boolean;
};

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || !["admin", "super_admin"].includes(session.role)) {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as OwnerCredentialRequest;
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid owner email is required." }, { status: 400 });
  }

  const action = body.action ?? "send-credentials";
  const temporaryPassword = action === "create-owner" || action === "reset-password"
    ? generateTemporaryPassword()
    : undefined;

  const user = await getOrCreateOwnerUser({
    email,
    displayName: body.ownerName?.trim() || email,
    password: temporaryPassword,
    disabled: body.loginEnabled === false,
  });

  if (action === "toggle-login") {
    await adminAuth().updateUser(user.uid, { disabled: body.loginEnabled === false });
  }

  await adminDb().collection("users").doc(user.uid).set({
    email,
    displayName: body.ownerName?.trim() || email,
    role: "owner",
    active: body.loginEnabled !== false,
    tenantId: body.restaurantSlug,
    restaurantIds: body.restaurantSlug ? [body.restaurantSlug] : [],
    branchIds: body.branchId ? [body.branchId] : [],
    forcePasswordReset: action === "reset-password" || action === "create-owner",
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const emailResult = await sendCredentialEmail({
    to: email,
    ownerName: body.ownerName?.trim() || email,
    restaurantName: body.restaurantName?.trim() || "your restaurant",
    action,
    temporaryPassword,
  });

  return NextResponse.json({
    ok: true,
    uid: user.uid,
    emailSent: emailResult.sent,
    emailSkippedReason: emailResult.skippedReason,
    temporaryPassword,
  });
}

async function getOrCreateOwnerUser(input: {
  email: string;
  displayName: string;
  password?: string;
  disabled?: boolean;
}) {
  try {
    const existing = await adminAuth().getUserByEmail(input.email);
    await adminAuth().updateUser(existing.uid, {
      displayName: input.displayName,
      disabled: input.disabled,
      ...(input.password ? { password: input.password } : {}),
    });
    return existing;
  } catch {
    return adminAuth().createUser({
      email: input.email,
      displayName: input.displayName,
      password: input.password ?? generateTemporaryPassword(),
      disabled: input.disabled,
      emailVerified: false,
    });
  }
}

async function sendCredentialEmail(input: {
  to: string;
  ownerName: string;
  restaurantName: string;
  action: string;
  temporaryPassword?: string;
}) {
  const smtp = getSmtpConfig();
  if (!smtp.ok) return { sent: false, skippedReason: smtp.error };

  const subject = input.action === "reset-password"
    ? "Sarva Food owner password reset"
    : "Sarva Food owner login credentials";
  const passwordText = input.temporaryPassword
    ? `Temporary password: ${input.temporaryPassword}`
    : "Use the forgot password link on the owner login screen if you need to set a new password.";

  const transporter = nodemailer.createTransport(smtp.options);
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: input.to,
    subject,
    text: `Hi ${input.ownerName},\n\nYour Sarva Food owner access for ${input.restaurantName} is ready.\n\nUsername: ${input.to}\n${passwordText}\n\nLogin: ${process.env.NEXT_PUBLIC_APP_URL || "https://sarva-food.example"}/owner/login\n\nFor security, change the password after login.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
        <h1 style="margin:0 0 12px;font-size:24px">Sarva Food owner access</h1>
        <p style="line-height:1.6">Hi ${escapeHtml(input.ownerName)}, your owner access for <strong>${escapeHtml(input.restaurantName)}</strong> is ready.</p>
        <div style="border:1px solid #e5e7eb;border-radius:14px;padding:16px;background:#f9fafb">
          <p><strong>Username:</strong> ${escapeHtml(input.to)}</p>
          <p><strong>${input.temporaryPassword ? "Temporary password" : "Password"}:</strong> ${escapeHtml(input.temporaryPassword ?? "Use forgot password to set a new password")}</p>
        </div>
        <p style="line-height:1.6">For security, change the password after login.</p>
      </div>
    `,
  });
  return { sent: true };
}

function getSmtpConfig():
  | { ok: true; options: TransportOptions }
  | { ok: false; error: string } {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = host?.includes("gmail.com") ? process.env.SMTP_PASS?.replace(/\s+/g, "") : process.env.SMTP_PASS?.trim();
  const from = (process.env.SMTP_FROM || user)?.trim();

  if (!host || !Number.isInteger(port) || port <= 0 || !user || !pass || !from) {
    return { ok: false, error: "SMTP is not configured." };
  }
  if (/replace[_-]?me|placeholder|your[_-]?smtp/i.test(pass)) {
    return { ok: false, error: "SMTP password is still a placeholder." };
  }

  return {
    ok: true,
    options: {
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    },
  };
}

function generateTemporaryPassword() {
  return `SF-${crypto.randomBytes(3).toString("hex").toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}!`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
