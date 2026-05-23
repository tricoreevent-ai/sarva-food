import { NextResponse, type NextRequest } from "next/server";
import { randomInt, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import nodemailer, { type TransportOptions } from "nodemailer";
import { adminAuth, adminDb } from "@/firebase/admin";

type OtpPurpose = "signup" | "reset";
type OtpAction = "request" | "verify" | "complete";

const OTP_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TTL_MS = 10 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const PASSWORD_MIN_LENGTH = 8;
const OTP_DELIVERY_ERROR = "Unable to send OTP right now. Please try again later.";

type OtpDoc = {
  id: string;
  email: string;
  emailHash: string;
  purpose: OtpPurpose;
  otpHash: string;
  salt: string;
  requestCount: number;
  attempts: number;
  expiresAt: string;
  resendAfter: string;
  windowStartedAt: string;
  verifiedAt?: string;
  verifiedTokenHash?: string;
  verifiedTokenExpiresAt?: string;
  completedAt?: string;
  lockedUntil?: string;
  createdAt: string;
  updatedAt: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as {
      action?: OtpAction;
      purpose?: OtpPurpose;
      email?: string;
      code?: string;
      verificationToken?: string;
      password?: string;
      displayName?: string;
    };
    const action = body.action;
    const purpose = body.purpose;
    const email = normalizeEmail(body.email);

    if (!action || !["request", "verify", "complete"].includes(action)) {
      return jsonError("Invalid OTP action.", 400);
    }
    if (!purpose || !["signup", "reset"].includes(purpose)) {
      return jsonError("Invalid OTP purpose.", 400);
    }
    if (!email) {
      return jsonError("A valid email address is required.", 400);
    }

    if (action === "request") {
      return requestOtp(email, purpose);
    }
    if (action === "verify") {
      return verifyOtp(email, purpose, body.code);
    }
    return completeOtp(email, purpose, body.verificationToken, body.password, body.displayName);
  } catch (error) {
    logOtpFailure("email-otp-unhandled", error);
    return jsonError("Email OTP service is temporarily unavailable.", 500, { code: "otp_unavailable" });
  }
}

async function requestOtp(email: string, purpose: OtpPurpose) {
  const smtp = getSmtpConfig();
  if (!smtp.ok) {
    logOtpFailure("smtp-config", smtp.error);
    return jsonError(OTP_DELIVERY_ERROR, 503, { code: "smtp_unavailable" });
  }

  if (purpose === "signup") {
    const existing = await adminAuth().getUserByEmail(email).catch(() => null);
    if (existing) return jsonError("An account already exists for this email. Please sign in or reset your password.", 409);
  }

  if (purpose === "reset") {
    const existing = await adminAuth().getUserByEmail(email).catch(() => null);
    if (!existing) return jsonError("No customer account exists for this email.", 404);
  }

  const ref = otpRef(email, purpose);
  const snapshot = await ref.get();
  const previous = snapshot.exists ? snapshot.data() as OtpDoc : null;
  const now = Date.now();
  const resendAfter = previous?.resendAfter ? Date.parse(previous.resendAfter) : 0;
  const lockedUntil = previous?.lockedUntil ? Date.parse(previous.lockedUntil) : 0;
  const windowStartedAt = previous?.windowStartedAt ? Date.parse(previous.windowStartedAt) : 0;
  const insideWindow = windowStartedAt > 0 && now - windowStartedAt < REQUEST_WINDOW_MS;
  const requestCount = insideWindow ? (previous?.requestCount ?? 0) + 1 : 1;

  if (lockedUntil > now) {
    return jsonError("Too many OTP requests. Please try again later.", 429, { retryAfterSeconds: secondsUntil(lockedUntil, now) });
  }
  if (resendAfter > now) {
    return jsonError("Please wait before requesting another OTP.", 429, { retryAfterSeconds: secondsUntil(resendAfter, now) });
  }
  if (requestCount > MAX_REQUESTS_PER_WINDOW) {
    const lockUntil = now + REQUEST_WINDOW_MS;
    await ref.set({
      lockedUntil: new Date(lockUntil).toISOString(),
      updatedAt: new Date(now).toISOString(),
    }, { merge: true });
    return jsonError("Too many OTP requests. Please wait 15 minutes before trying again.", 429, { retryAfterSeconds: secondsUntil(lockUntil, now) });
  }

  const otp = String(randomInt(100000, 999999));
  const salt = randomBytes(16).toString("hex");
  const doc: OtpDoc = {
    id: ref.id,
    email,
    emailHash: sha256(email),
    purpose,
    otpHash: hashOtp(otp, salt, email, purpose),
    salt,
    requestCount,
    attempts: 0,
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    resendAfter: new Date(now + RESEND_DELAY_MS).toISOString(),
    windowStartedAt: new Date(insideWindow ? windowStartedAt : now).toISOString(),
    createdAt: previous?.createdAt ?? new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };

  await ref.set(doc, { merge: true });
  try {
    await sendOtpEmail(email, otp, purpose, smtp.options);
  } catch (error) {
    logOtpFailure("smtp-send", error);
    await ref.delete().catch(() => undefined);
    return jsonError(OTP_DELIVERY_ERROR, 503, { code: "smtp_delivery_failed" });
  }

  return NextResponse.json({
    ok: true,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    resendAfterSeconds: Math.floor(RESEND_DELAY_MS / 1000),
    attemptsRemaining: MAX_VERIFY_ATTEMPTS,
  });
}

async function verifyOtp(email: string, purpose: OtpPurpose, code?: string) {
  const normalizedCode = (code ?? "").replace(/\D/g, "");
  if (normalizedCode.length !== 6) {
    return jsonError("Enter the 6 digit OTP sent to your email.", 400);
  }

  const ref = otpRef(email, purpose);
  const snapshot = await ref.get();
  if (!snapshot.exists) return jsonError("OTP expired or not requested.", 404);
  const doc = snapshot.data() as OtpDoc;
  const now = Date.now();
  if (Date.parse(doc.expiresAt) < now) {
    await ref.delete().catch(() => undefined);
    return jsonError("OTP expired. Request a new code.", 410);
  }
  if ((doc.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    return jsonError("Too many invalid OTP attempts. Request a new code.", 429);
  }

  const expected = doc.otpHash;
  const received = hashOtp(normalizedCode, doc.salt, email, purpose);
  if (!safeEqual(expected, received)) {
    const attempts = (doc.attempts ?? 0) + 1;
    await ref.set({ attempts, updatedAt: new Date(now).toISOString() }, { merge: true });
    return jsonError("OTP does not match.", 401, { attemptsRemaining: Math.max(0, MAX_VERIFY_ATTEMPTS - attempts) });
  }

  const verificationToken = randomBytes(32).toString("hex");
  await ref.set({
    verifiedAt: new Date(now).toISOString(),
    verifiedTokenHash: sha256(verificationToken),
    verifiedTokenExpiresAt: new Date(now + VERIFIED_TTL_MS).toISOString(),
    updatedAt: new Date(now).toISOString(),
  }, { merge: true });

  return NextResponse.json({
    ok: true,
    verificationToken,
    tokenExpiresInSeconds: Math.floor(VERIFIED_TTL_MS / 1000),
  });
}

async function completeOtp(
  email: string,
  purpose: OtpPurpose,
  verificationToken?: string,
  password?: string,
  displayName?: string,
) {
  if (!verificationToken || verificationToken.length < 32) {
    return jsonError("OTP verification token is missing.", 400);
  }
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return jsonError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, 400);
  }

  const ref = otpRef(email, purpose);
  const snapshot = await ref.get();
  if (!snapshot.exists) return jsonError("OTP verification expired. Request a new code.", 404);
  const doc = snapshot.data() as OtpDoc;
  const now = Date.now();

  if (!doc.verifiedTokenHash || !doc.verifiedTokenExpiresAt || Date.parse(doc.verifiedTokenExpiresAt) < now) {
    await ref.delete().catch(() => undefined);
    return jsonError("OTP verification expired. Request a new code.", 410);
  }
  if (!safeEqual(doc.verifiedTokenHash, sha256(verificationToken))) {
    return jsonError("OTP verification token is invalid.", 401);
  }
  if (doc.completedAt) {
    return jsonError("This OTP has already been used.", 409);
  }

  const auth = adminAuth();
  let userRecord;
  if (purpose === "signup") {
    const existing = await auth.getUserByEmail(email).catch(() => null);
    if (existing) return jsonError("An account already exists for this email. Please sign in.", 409);
    userRecord = await auth.createUser({
      email,
      emailVerified: true,
      password,
      displayName: displayName?.trim() || email.split("@")[0],
      disabled: false,
    });
  } else {
    userRecord = await auth.getUserByEmail(email).catch(() => null);
    if (!userRecord) return jsonError("No customer account exists for this email.", 404);
    await auth.updateUser(userRecord.uid, {
      password,
      emailVerified: true,
      displayName: userRecord.displayName || displayName?.trim() || email.split("@")[0],
    });
  }

  await upsertCustomerAuthDocs(userRecord.uid, {
    email,
    displayName: displayName?.trim() || userRecord.displayName || email.split("@")[0],
  });
  await ref.set({
    completedAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  }, { merge: true });
  await ref.delete().catch(() => undefined);

  return NextResponse.json({ ok: true, uid: userRecord.uid });
}

async function upsertCustomerAuthDocs(uid: string, input: { email: string; displayName: string }) {
  const db = adminDb();
  const now = new Date().toISOString();
  const userProfile = {
    id: uid,
    uid,
    displayName: input.displayName,
    email: input.email,
    role: "customer",
    roleId: "customer",
    tenantIds: [],
    restaurantIds: [],
    branchIds: [],
    permissions: ["customer:profile", "customer:orders"],
    active: true,
    updatedAt: now,
  };
  const customerProfile = {
    id: uid,
    uid,
    displayName: input.displayName,
    email: input.email,
    emailVerified: true,
    active: true,
    updatedAt: now,
  };

  await db.collection("users").doc(uid).set({ ...userProfile, createdAt: now }, { merge: true });
  await db.collection("customerProfiles").doc(uid).set({ ...customerProfile, createdAt: now }, { merge: true });
}

async function sendOtpEmail(
  email: string,
  otp: string,
  purpose: OtpPurpose,
  smtp: TransportOptions,
) {
  const transporter = nodemailer.createTransport(smtp);
  const subject = purpose === "signup" ? "Verify your Sarva account" : "Reset your Sarva password";
  const heading = purpose === "signup" ? "Create your Sarva account" : "Reset your password";
  await retrySmtp(() => (transporter as unknown as { verify: () => Promise<unknown> }).verify());
  await retrySmtp(() => transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text: `${heading}\n\nYour OTP is ${otp}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#241812">
        <h1 style="font-size:24px;margin:0 0 12px">${heading}</h1>
        <p style="font-size:15px;line-height:1.6">Use this one-time password to continue. It expires in 10 minutes.</p>
        <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#fff0e2;border-radius:12px;padding:18px 20px;text-align:center">${otp}</div>
        <p style="font-size:13px;line-height:1.5;color:#7c5f50">For your safety, do not share this code with anyone.</p>
      </div>
    `,
  }));
}

function getSmtpConfig():
  | { ok: true; options: TransportOptions }
  | { ok: false; error: string } {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS;
  const pass = host?.includes("gmail.com") ? rawPass?.replace(/\s+/g, "") : rawPass?.trim();
  const from = (process.env.SMTP_FROM || user)?.trim();

  if (!host || !Number.isInteger(port) || port <= 0 || !user || !pass || !from) {
    return { ok: false, error: "SMTP is not configured for email OTP delivery." };
  }

  if (isPlaceholderSmtpPassword(pass)) {
    return { ok: false, error: "SMTP_PASS is still the placeholder value. Generate a Gmail App Password and restart the server." };
  }

  if (host.includes("gmail.com") && !isLikelyGmailAppPassword(pass)) {
    return { ok: false, error: "Gmail SMTP requires a 16 character App Password without spaces. The configured SMTP_PASS is not a valid Gmail App Password shape." };
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

function isPlaceholderSmtpPassword(pass: string) {
  return /app-password-you-generated|replace[_-]?me|placeholder|your[_-]?smtp[_-]?pass/i.test(pass);
}

function isLikelyGmailAppPassword(pass: string) {
  return /^[a-z0-9]{16}$/i.test(pass);
}

function otpRef(email: string, purpose: OtpPurpose) {
  return adminDb().collection("emailOtps").doc(`${purpose}-${sha256(email).slice(0, 32)}`);
}

function normalizeEmail(email?: string) {
  const normalized = email?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function hashOtp(otp: string, salt: string, email: string, purpose: OtpPurpose) {
  return sha256(`${otp}:${salt}:${email}:${purpose}`);
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(first: string, second: string) {
  const a = Buffer.from(first, "hex");
  const b = Buffer.from(second, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function secondsUntil(target: number, now = Date.now()) {
  return Math.max(1, Math.ceil((target - now) / 1000));
}

async function retrySmtp<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientSmtpError(error)) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }
  }
  throw lastError;
}

function isTransientSmtpError(error: unknown) {
  const maybe = error as { code?: unknown; responseCode?: unknown };
  const code = typeof maybe.code === "string" ? maybe.code : "";
  const responseCode = typeof maybe.responseCode === "number" ? maybe.responseCode : 0;
  return ["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "EAI_AGAIN", "ESOCKET"].includes(code) || (responseCode >= 400 && responseCode < 500);
}

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

function logOtpFailure(scope: string, error: unknown) {
  const diagnostic = smtpDiagnosticMessage(error);
  console.warn(`[Sarva] ${scope}: ${diagnostic}`);
}

function smtpDiagnosticMessage(error: unknown) {
  if (typeof error === "string") return error;
  const maybe = error as { message?: unknown; code?: unknown; responseCode?: unknown; command?: unknown };
  const message = typeof maybe?.message === "string" ? maybe.message : String(error);
  const code = typeof maybe?.code === "string" ? maybe.code : undefined;
  const responseCode = typeof maybe?.responseCode === "number" ? maybe.responseCode : undefined;
  const command = typeof maybe?.command === "string" ? maybe.command : undefined;

  if (responseCode === 535 || /Username and Password not accepted|Invalid login/i.test(message)) {
    return "Gmail rejected SMTP authentication (535). Exact cause: SMTP_USER/SMTP_PASS are not accepted by Gmail. Use the Gmail account's 16 character App Password, not the Google account password or placeholder text.";
  }

  return [
    message.replace(/\s+/g, " ").trim(),
    code ? `code=${code}` : "",
    responseCode ? `responseCode=${responseCode}` : "",
    command ? `command=${command}` : "",
  ].filter(Boolean).join(" ");
}
