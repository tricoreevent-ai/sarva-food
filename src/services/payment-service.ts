import type { PaymentIntentDraft, PaymentProvider } from "@/types/firebase";

export type PaymentProviderAdapter = {
  provider: PaymentProvider;
  createIntent: (draft: PaymentIntentDraft) => Promise<{ id: string; clientSecret?: string }>;
  verifyWebhook: (payload: unknown, signature: string) => Promise<boolean>;
};

function notImplemented(provider: PaymentProvider): PaymentProviderAdapter {
  return {
    provider,
    async createIntent(draft) {
      return {
        id: `${provider}_${draft.orderId}_draft`,
        clientSecret: undefined,
      };
    },
    async verifyWebhook() {
      return false;
    },
  };
}

export const paymentProviders: Record<PaymentProvider, PaymentProviderAdapter> = {
  razorpay: notImplemented("razorpay"),
  stripe: notImplemented("stripe"),
  upi: notImplemented("upi"),
};

export async function createPaymentIntentDraft(draft: PaymentIntentDraft) {
  // Placeholder only: final gateway integration should live in Cloud Functions,
  // never directly in client components.
  return paymentProviders[draft.provider].createIntent(draft);
}

export function buildUpiPaymentUri(input: {
  vpa: string;
  merchantName: string;
  amount: number;
  transactionRef: string;
  note?: string;
}) {
  const params = new URLSearchParams({
    pa: input.vpa,
    pn: input.merchantName,
    am: input.amount.toFixed(2),
    tr: input.transactionRef,
    tn: input.note ?? "Nammude order",
    cu: "INR",
  });

  return `upi://pay?${params.toString()}`;
}

export async function createRazorpayOrder(input: {
  orderId: string;
  amount: number;
  currency?: "INR";
  idToken?: string;
}) {
  const response = await fetch("/api/payments/razorpay/order", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(input.idToken ? { authorization: `Bearer ${input.idToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Unable to create Razorpay order.");
  }

  return response.json() as Promise<{
    provider: "razorpay";
    providerOrderId: string;
    amount: number;
    currency: "INR";
  }>;
}
