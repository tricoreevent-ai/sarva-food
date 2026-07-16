"use client";

export type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  image?: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; contact?: string; email?: string };
  theme?: { color: string };
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions & {
      handler: (response: RazorpayCheckoutResponse) => void;
      modal: { ondismiss: () => void };
    }) => RazorpayCheckout;
  }
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions) {
  await loadRazorpayCheckout();
  const checkout = window.Razorpay;
  if (!checkout) throw new Error("Razorpay checkout could not be loaded.");
  return new Promise<RazorpayCheckoutResponse>((resolve, reject) => {
    const instance = new checkout({
      ...options,
      theme: options.theme ?? { color: "#f97316" },
      handler: resolve,
      modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
    });
    instance.on("payment.failed", (response) => reject(new Error(response.error?.description || "Razorpay payment failed.")));
    instance.open();
  });
}

async function loadRazorpayCheckout() {
  if (typeof window === "undefined" || window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay checkout failed to load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("Razorpay checkout failed to load."));
    document.head.appendChild(script);
  });
}
