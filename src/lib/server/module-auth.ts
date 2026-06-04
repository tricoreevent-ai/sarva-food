import { randomBytes, randomInt, createHash, timingSafeEqual } from "node:crypto";
import nodemailer, { type TransportOptions } from "nodemailer";
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/firebase/admin";
import {
  legacySessionCookieNames,
  scopedSessionCookieNames,
  type SessionSurface,
  type VerifiedSession,
} from "@/lib/server-auth";
import type { UserRole } from "@/types/firebase";

type ModuleSurface = Extract<SessionSurface, "owner" | "admin">;
type OtpAction = "request" | "verify" | "complete";

type ModuleOtpDoc = {
  id: string;
  email: string;
  surface: ModuleSurface;
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

const ownerRoles = new Set<UserRole>([
  "owner",
  "manager",
  "cashier",
  "waiter",
  "chef",
  "kitchen-manager",
  "accountant",
  "inventory-manager",
  "delivery-staff",
  "delivery",
]);
const adminRoles = new Set<UserRole>(["admin", "super_admin"]);
const OTP_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TTL_MS = 10 * 60 * 1000;
const RESEND_DELAY_MS = 60 * 1000;
const REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const PASSWORD_MIN_LENGTH = 8;
const OTP_DELIVERY_ERROR = "Unable to send OTP right now. Please try again later.";

export async function handleModuleLogin(request: NextRequest, surface: ModuleSurface) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = normalizeEmail(body.email);
  const password = body.password ?? "";

  if (!email || password.length < 6) {
    return jsonError("Enter a valid email and password.", 400);
  }

  const credential = await verifyFirebasePassword(email, password).catch((error) => {
    console.warn(`[Sarva] ${surface}-login-password-check: ${authDiagnosticMessage(error)}`);
    return null;
  });
  if (!credential?.uid) {
    return jsonError("The email or password is incorrect.", 401);
  }

  const session = await verifiedModuleSession(credential.uid, surface);
  if (!session) {
    return jsonError(surface === "admin"
      ? "Admin profile is inactive, missing, or not allowed for this module."
      : "Owner profile is inactive, missing, or not allowed for this module.", 403);
  }

  const response = NextResponse.json({
    ok: true,
    uid: session.uid,
    role: session.role,
    tenantId: session.tenantId,
    restaurantIds: session.restaurantIds,
  });
  writeModuleSessionCookies(request, response, session, surface);
  return response;
}

export async function handleModulePasswordOtp(request: NextRequest, surface: ModuleSurface) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: OtpAction;
      email?: string;
      code?: string;
      verificationToken?: string;
      password?: string;
    };
    const action = body.action;
    const email = normalizeEmail(body.email);

    if (!action || !["request", "verify", "complete"].includes(action)) {
      return jsonError("Invalid OTP action.", 400);
    }
    if (!email) {
      return jsonError("A valid email address is required.", 400);
    }

    if (action === "request") return requestModuleOtp(email, surface);
    if (action === "verify") return verifyModuleOtp(email, surface, body.code);
    return completeModuleOtp(email, surface, body.verificationToken, body.password);
  } catch (error) {
    console.warn(`[Sarva] ${surface}-password-otp: ${authDiagnosticMessage(error)}`);
    return jsonError("Password reset is temporarily unavailable.", 500);
  }
}

async function verifiedModuleSession(uid: string, surface: ModuleSurface): Promise<VerifiedSession | null> {
  const profile = await adminDb().collection("users").doc(uid).get();
  const user = profile.data() as {
    role?: UserRole;
    tenantId?: string;
    tenantIds?: string[];
    restaurantIds?: string[];
    branchIds?: string[];
    active?: boolean;
  } | undefined;

  if (!user?.active || !user.role || !roleAllowedForModule(user.role, surface)) return null;
  const tenantIds = user.tenantIds ?? (user.tenantId ? [user.tenantId] : user.restaurantIds ?? []);

  return {
    uid,
    role: user.role,
    tenantId: user.tenantId ?? tenantIds[0],
    tenantIds,
    branchIds: user.branchIds ?? [],
    restaurantIds: user.restaurantIds ?? [],
  };
}

async function requestModuleOtp(email: string, surface: ModuleSurface) {
  const account = await getAllowedModuleAccount(email, surface);
  if (!account) {
    return jsonError(surface === "admin" ? "No active admin account exists for this email." : "No active owner account exists for this email.", 404);
  }

  const smtp = getSmtpConfig();
  if (!smtp.ok) {
    console.warn(`[Sarva] ${surface}-otp-smtp-config: ${smtp.error}`);
    return jsonError(OTP_DELIVERY_ERROR, 503, { code: "smtp_unavailable" });
  }

  const ref = moduleOtpRef(email, surface);
  const snapshot = await ref.get();
  const previous = snapshot.exists ? snapshot.data() as ModuleOtpDoc : null;
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
    await ref.set({ lockedUntil: new Date(lockUntil).toISOString(), updatedAt: new Date(now).toISOString() }, { merge: true });
    return jsonError("Too many OTP requests. Please wait 15 minutes before trying again.", 429, { retryAfterSeconds: secondsUntil(lockUntil, now) });
  }

  const otp = String(randomInt(100000, 999999));
  const salt = randomBytes(16).toString("hex");
  await ref.set({
    id: ref.id,
    email,
    surface,
    otpHash: hashOtp(otp, salt, email, surface),
    salt,
    requestCount,
    attempts: 0,
    expiresAt: new Date(now + OTP_TTL_MS).toISOString(),
    resendAfter: new Date(now + RESEND_DELAY_MS).toISOString(),
    windowStartedAt: new Date(insideWindow ? windowStartedAt : now).toISOString(),
    createdAt: previous?.createdAt ?? new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  } satisfies ModuleOtpDoc, { merge: true });

  try {
    await sendModuleOtpEmail(email, otp, surface, smtp.options);
  } catch (error) {
    console.warn(`[Sarva] ${surface}-otp-smtp-send: ${authDiagnosticMessage(error)}`);
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

async function verifyModuleOtp(email: string, surface: ModuleSurface, code?: string) {
  const normalizedCode = (code ?? "").replace(/\D/g, "");
  if (normalizedCode.length !== 6) {
    return jsonError("Enter the 6 digit OTP sent to your email.", 400);
  }

  const ref = moduleOtpRef(email, surface);
  const snapshot = await ref.get();
  if (!snapshot.exists) return jsonError("OTP expired or not requested.", 404);
  const doc = snapshot.data() as ModuleOtpDoc;
  const now = Date.now();
  if (Date.parse(doc.expiresAt) < now) {
    await ref.delete().catch(() => undefined);
    return jsonError("OTP expired. Request a new code.", 410);
  }
  if ((doc.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    return jsonError("Too many invalid OTP attempts. Request a new code.", 429);
  }

  const received = hashOtp(normalizedCode, doc.salt, email, surface);
  if (!safeEqual(doc.otpHash, received)) {
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

async function completeModuleOtp(email: string, surface: ModuleSurface, verificationToken?: string, password?: string) {
  if (!verificationToken || verificationToken.length < 32) {
    return jsonError("OTP verification token is missing.", 400);
  }
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return jsonError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`, 400);
  }

  const account = await getAllowedModuleAccount(email, surface);
  if (!account) {
    return jsonError(surface === "admin" ? "No active admin account exists for this email." : "No active owner account exists for this email.", 404);
  }

  const ref = moduleOtpRef(email, surface);
  const snapshot = await ref.get();
  if (!snapshot.exists) return jsonError("OTP verification expired. Request a new code.", 404);
  const doc = snapshot.data() as ModuleOtpDoc;
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

  await adminAuth().updateUser(account.uid, {
    password,
    emailVerified: true,
    disabled: false,
  });
  await adminDb().collection("users").doc(account.uid).set({
    active: true,
    updatedAt: new Date(now).toISOString(),
  }, { merge: true });
  await ref.set({ completedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() }, { merge: true });
  await ref.delete().catch(() => undefined);

  return NextResponse.json({ ok: true });
}

async function getAllowedModuleAccount(email: string, surface: ModuleSurface) {
  const authUser = await adminAuth().getUserByEmail(email).catch(() => null);
  if (!authUser) return null;
  const session = await verifiedModuleSession(authUser.uid, surface);
  return session ? { uid: authUser.uid, session } : null;
}

async function verifyFirebasePassword(email: string, password: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is missing.");

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const payload = await response.json().catch(() => null) as { localId?: string; error?: { message?: string } } | null;
  if (!response.ok || !payload?.localId) {
    throw new Error(payload?.error?.message || `Firebase password verification failed with ${response.status}.`);
  }
  return { uid: payload.localId };
}

function writeModuleSessionCookies(
  request: NextRequest,
  response: NextResponse,
  session: VerifiedSession,
  surface: ModuleSurface,
) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isLocalHost = /^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$|^\[::1\](?::\d+)?$/i.test(host);
  const isHttps = request.nextUrl.protocol === "https:" || forwardedProto === "https";
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isHttps || (process.env.NODE_ENV === "production" && !isLocalHost),
    path: "/",
    maxAge: 60 * 60 * 24 * 5,
  };
  const names = scopedSessionCookieNames[surface];
  response.cookies.set(names.uid, session.uid, options);
  response.cookies.set(names.role, session.role, options);
  if (session.tenantId) response.cookies.set(names.tenantId, session.tenantId, options);
  else response.cookies.delete(names.tenantId);
  if (session.tenantIds.length) response.cookies.set(names.tenantIds, session.tenantIds.join(","), options);
  else response.cookies.delete(names.tenantIds);
  if (session.branchIds.length) response.cookies.set(names.branchIds, session.branchIds.join(","), options);
  else response.cookies.delete(names.branchIds);
  if (session.restaurantIds.length) response.cookies.set(names.restaurantIds, session.restaurantIds.join(","), options);
  else response.cookies.delete(names.restaurantIds);

  deleteCookieGroup(response, legacySessionCookieNames);
  deleteCookieGroup(response, scopedSessionCookieNames.customer);
  deleteCookieGroup(response, scopedSessionCookieNames[surface === "admin" ? "owner" : "admin"]);
}

function deleteCookieGroup(response: NextResponse, names: typeof legacySessionCookieNames) {
  response.cookies.delete(names.uid);
  response.cookies.delete(names.role);
  response.cookies.delete(names.tenantId);
  response.cookies.delete(names.tenantIds);
  response.cookies.delete(names.branchIds);
  response.cookies.delete(names.restaurantIds);
}

function roleAllowedForModule(role: UserRole, surface: ModuleSurface) {
  return surface === "admin" ? adminRoles.has(role) : ownerRoles.has(role);
}

async function sendModuleOtpEmail(email: string, otp: string, surface: ModuleSurface, smtp: TransportOptions) {
  const transporter = nodemailer.createTransport(smtp);
  const moduleName = surface === "admin" ? "Admin" : "Owner";
  await retrySmtp(() => (transporter as unknown as { verify: () => Promise<unknown> }).verify());
  await retrySmtp(() => transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Reset your Sarva ${moduleName} password`,
    text: `Reset your Sarva ${moduleName} password\n\nYour OTP is ${otp}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#241812">
        <h1 style="font-size:24px;margin:0 0 12px">Reset your Sarva ${moduleName} password</h1>
        <p style="font-size:15px;line-height:1.6">Use this one-time password to set a new ${moduleName.toLowerCase()} portal password. It expires in 10 minutes.</p>
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

  if (/app-password-you-generated|replace[_-]?me|placeholder|your[_-]?smtp[_-]?pass/i.test(pass)) {
    return { ok: false, error: "SMTP_PASS is still a placeholder value." };
  }

  if (host.includes("gmail.com") && !/^[a-z0-9]{16}$/i.test(pass)) {
    return { ok: false, error: "Gmail SMTP requires a 16 character App Password without spaces." };
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

function moduleOtpRef(email: string, surface: ModuleSurface) {
  return adminDb().collection("modulePasswordOtps").doc(`${surface}-${sha256(email).slice(0, 32)}`);
}

function normalizeEmail(email?: string) {
  const normalized = email?.trim().toLowerCase() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function hashOtp(otp: string, salt: string, email: string, surface: ModuleSurface) {
  return sha256(`${otp}:${salt}:${email}:${surface}:password-reset`);
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
      const maybe = error as { code?: unknown; responseCode?: unknown };
      const code = typeof maybe.code === "string" ? maybe.code : "";
      const responseCode = typeof maybe.responseCode === "number" ? maybe.responseCode : 0;
      const transient = ["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "EAI_AGAIN", "ESOCKET"].includes(code) || (responseCode >= 400 && responseCode < 500);
      if (attempt >= attempts || !transient) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
    }
  }
  throw lastError;
}

function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

function authDiagnosticMessage(error: unknown) {
  if (typeof error === "string") return error;
  const maybe = error as { message?: unknown; code?: unknown; responseCode?: unknown };
  const message = typeof maybe?.message === "string" ? maybe.message : String(error);
  const code = typeof maybe?.code === "string" ? maybe.code : undefined;
  const responseCode = typeof maybe?.responseCode === "number" ? maybe.responseCode : undefined;
  return [code, responseCode, message].filter(Boolean).join(" ");
}
