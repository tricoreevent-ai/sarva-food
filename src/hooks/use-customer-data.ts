"use client";

import { useCallback, useEffect, useState } from "react";
import { safeClientReason } from "@/lib/client-diagnostics";
import type { CustomerAddressDoc, CustomerLoyaltyDoc, CustomerOrderDoc, CustomerProfileDoc, FirestoreDate } from "@/types/firebase";
import type { CateringQuote } from "@/lib/types";

export type CustomerDataStatus = "idle" | "loading" | "success" | "error";
export type CustomerPaymentMethodDoc = { id: string; customerId: string; label?: string; brand?: string; type?: string; last4?: string; isDefault?: boolean };
export type CustomerSavedRestaurantDoc = { id: string; customerId: string; restaurantId?: string; slug?: string; name?: string; savedAt?: FirestoreDate };
export type CustomerCouponDoc = { id: string; customerId: string; code?: string; title?: string; active?: boolean; status?: string; expiresAt?: FirestoreDate };
export type CustomerReviewDoc = { id: string; customerId: string; restaurantId?: string; rating?: number; createdAt?: FirestoreDate };

type Payload = {
  profile: CustomerProfileDoc | null;
  addresses: CustomerAddressDoc[];
  orders: CustomerOrderDoc[];
  loyalty: CustomerLoyaltyDoc | null;
  payments: CustomerPaymentMethodDoc[];
  savedRestaurants: CustomerSavedRestaurantDoc[];
  coupons: CustomerCouponDoc[];
  reviews: CustomerReviewDoc[];
  cateringInquiries: CateringQuote[];
};

const empty: Payload = { profile: null, addresses: [], orders: [], loyalty: null, payments: [], savedRestaurants: [], coupons: [], reviews: [], cateringInquiries: [] };

export function useCustomerData(customerId?: string | null) {
  const [data, setData] = useState<Payload>(empty);
  const [status, setStatus] = useState<CustomerDataStatus>(customerId ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);

  const retry = useCallback(async () => {
    if (!customerId) {
      setData(empty);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/customer/account", { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { data?: Payload; error?: string };
      if (!response.ok || !payload.data) {
        setStatus("error");
        setError(payload.error || "Could not load customer account.");
        return;
      }
      setData(payload.data);
      setStatus("success");
    } catch (error) {
      console.error("[customer-data] load failed", { reason: safeClientReason(error) });
      setStatus("error");
      setError("Could not load customer account. Check your connection and try again.");
    }
  }, [customerId]);

  useEffect(() => {
    queueMicrotask(() => void retry());
  }, [retry]);

  return { ...data, status, error, retry };
}
