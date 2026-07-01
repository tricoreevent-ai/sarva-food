import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { adminAuth, adminDb } from "@/firebase/admin";
import { COLLECTIONS } from "@/firebase/collections";
import { normalizeIndiaPhone, type PhoneVerificationContext } from "@/lib/phone-verification";

type RecordInput = {
  idToken: string;
  phone: string;
  context: PhoneVerificationContext;
  deviceId?: string;
};

type VerifyInput = {
  token: string;
  phone: string;
  context: PhoneVerificationContext;
  deviceId?: string;
  consume?: boolean;
};

export class PhoneVerificationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export class PhoneVerificationRepository {
  private collection = adminDb().collection(COLLECTIONS.phoneVerificationSessions);

  async record(input: RecordInput) {
    const normalizedPhone = normalizeIndiaPhone(input.phone);
    if (!normalizedPhone) throw new PhoneVerificationError("Enter a valid mobile number.");
    const decoded = await adminAuth().verifyIdToken(input.idToken);
    const tokenPhone = normalizeIndiaPhone(String(decoded.phone_number ?? ""));
    if (tokenPhone !== normalizedPhone) {
      throw new PhoneVerificationError("Verified mobile number does not match.");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60_000);
    const id = hash(`${decoded.uid}:${input.context}:${input.deviceId ?? "browser"}:${normalizedPhone}`).slice(0, 32);
    const secret = randomBytes(24).toString("base64url");
    const token = `${id}.${secret}`;
    await this.collection.doc(id).set({
      id,
      uid: decoded.uid,
      phone: normalizedPhone,
      normalizedPhone,
      context: input.context,
      deviceId: input.deviceId ?? "",
      verificationTokenHash: hash(secret),
      active: true,
      verifiedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    await this.markCustomerPhoneVerified(decoded.uid, normalizedPhone, input.context, now);
    return { token, phone: normalizedPhone, expiresAt: expiresAt.toISOString() };
  }

  async verify(input: VerifyInput) {
    const [id, secret] = input.token.split(".");
    const normalizedPhone = normalizeIndiaPhone(input.phone);
    if (!id || !secret || !normalizedPhone) {
      throw new PhoneVerificationError("Mobile verification is required.", 428);
    }
    const ref = this.collection.doc(id);
    const snapshot = await ref.get();
    const data = snapshot.data();
    if (!snapshot.exists || !data?.active) {
      throw new PhoneVerificationError("Mobile verification has expired.", 428);
    }
    if (!safeEqual(hash(secret), String(data.verificationTokenHash ?? ""))) {
      throw new PhoneVerificationError("Mobile verification has expired.", 428);
    }
    if (String(data.normalizedPhone ?? "") !== normalizedPhone || data.context !== input.context) {
      throw new PhoneVerificationError("Mobile verification does not match this session.", 428);
    }
    if (input.deviceId && data.deviceId && data.deviceId !== input.deviceId) {
      throw new PhoneVerificationError("Mobile verification belongs to another device.", 428);
    }
    if (Date.parse(String(data.expiresAt ?? "")) <= Date.now() || data.usedAt) {
      throw new PhoneVerificationError("Mobile verification has expired.", 428);
    }
    if (input.consume) {
      await ref.set({ usedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    }
    return { uid: String(data.uid), phone: normalizedPhone };
  }

  private async markCustomerPhoneVerified(uid: string, phone: string, context: PhoneVerificationContext, now: Date) {
    const stamp = now.toISOString();
    const customerContexts: PhoneVerificationContext[] = ["customer-login", "customer-registration", "qr-ordering", "customer-profile"];
    const userPatch = {
      id: uid,
      uid,
      phone,
      phoneVerified: true,
      active: true,
      updatedAt: stamp,
    };
    if (!customerContexts.includes(context)) {
      await adminDb().collection(COLLECTIONS.users).doc(uid).set(userPatch, { merge: true });
      return;
    }
    await Promise.all([
      adminDb().collection(COLLECTIONS.users).doc(uid).set({
        ...userPatch,
        role: "customer",
        roleId: "customer",
      }, { merge: true }),
      adminDb().collection(COLLECTIONS.customerProfiles).doc(uid).set({
        ...userPatch,
        phone,
      }, { merge: true }),
    ]);
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function safeEqual(first: string, second: string) {
  const a = Buffer.from(first);
  const b = Buffer.from(second);
  return a.length === b.length && timingSafeEqual(a, b);
}
