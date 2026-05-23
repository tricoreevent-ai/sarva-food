"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { COLLECTIONS } from "@/firebase/collections";
import { shouldUseFirebase } from "@/lib/env";
import type { CustomerAddressDoc, CustomerLoyaltyDoc, CustomerOrderDoc, CustomerProfileDoc, FirestoreDate } from "@/types/firebase";

export type CustomerDataStatus = "idle" | "loading" | "success" | "error";

export type CustomerPaymentMethodDoc = {
  id: string;
  customerId: string;
  label?: string;
  brand?: string;
  type?: string;
  last4?: string;
  isDefault?: boolean;
};

export type CustomerSavedRestaurantDoc = {
  id: string;
  customerId: string;
  restaurantId?: string;
  slug?: string;
  name?: string;
  savedAt?: FirestoreDate;
};

export type CustomerCouponDoc = {
  id: string;
  customerId: string;
  code?: string;
  title?: string;
  active?: boolean;
  status?: string;
  expiresAt?: FirestoreDate;
};

export type CustomerReviewDoc = {
  id: string;
  customerId: string;
  restaurantId?: string;
  rating?: number;
  createdAt?: FirestoreDate;
};

type CustomerLoadKey =
  | "profile"
  | "addresses"
  | "orders"
  | "loyalty"
  | "payments"
  | "savedRestaurants"
  | "coupons"
  | "reviews";

const CUSTOMER_LOAD_TIMEOUT_MS = 2000;
const loadKeys: CustomerLoadKey[] = [
  "profile",
  "addresses",
  "orders",
  "loyalty",
  "payments",
  "savedRestaurants",
  "coupons",
  "reviews",
];

function canUseCustomerFirestore() {
  try {
    return shouldUseFirebase() && isFirebaseConfigured && typeof window !== "undefined";
  } catch {
    return false;
  }
}

function mapDocs<T extends { id: string }>(docs: Array<QueryDocumentSnapshot<DocumentData>>) {
  return docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export function useCustomerData(customerId?: string | null) {
  const [profile, setProfile] = useState<CustomerProfileDoc | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddressDoc[]>([]);
  const [orders, setOrders] = useState<CustomerOrderDoc[]>([]);
  const [loyalty, setLoyalty] = useState<CustomerLoyaltyDoc | null>(null);
  const [payments, setPayments] = useState<CustomerPaymentMethodDoc[]>([]);
  const [savedRestaurants, setSavedRestaurants] = useState<CustomerSavedRestaurantDoc[]>([]);
  const [coupons, setCoupons] = useState<CustomerCouponDoc[]>([]);
  const [reviews, setReviews] = useState<CustomerReviewDoc[]>([]);
  const [status, setStatus] = useState<CustomerDataStatus>(customerId ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const retry = useCallback(() => {
    setStatus(customerId ? "loading" : "idle");
    setError(null);
    setVersion((current) => current + 1);
  }, [customerId]);

  useEffect(() => {
    if (!customerId || !canUseCustomerFirestore()) {
      const resetTimerId = window.setTimeout(() => {
        setProfile(null);
        setAddresses([]);
        setOrders([]);
        setLoyalty(null);
        setPayments([]);
        setSavedRestaurants([]);
        setCoupons([]);
        setReviews([]);
        setStatus("idle");
        setError(null);
      }, 0);
      return () => window.clearTimeout(resetTimerId);
    }

    let active = true;
    const loaded = Object.fromEntries(loadKeys.map((key) => [key, false])) as Record<CustomerLoadKey, boolean>;
    const unsubscribers: Unsubscribe[] = [];
    const errors: string[] = [];

    const finishIfReady = () => {
      if (!active) return;
      if (loadKeys.every((key) => loaded[key])) {
        window.clearTimeout(startTimerId);
        window.clearTimeout(timeoutId);
        setStatus("success");
        setError(errors[0] ?? null);
      }
    };

    const markLoaded = (key: CustomerLoadKey) => {
      loaded[key] = true;
      finishIfReady();
    };

    const noteError = (message: string) => {
      if (!errors.includes(message)) errors.push(message);
      setError(message);
    };

    const startTimerId = window.setTimeout(() => {
      if (!active) return;
      setStatus("loading");
      setError(null);
    }, 0);

    const timeoutId = window.setTimeout(() => {
      if (!active) return;
      window.clearTimeout(startTimerId);
      loadKeys.forEach((key) => {
        loaded[key] = true;
      });
      setStatus("success");
      setError(errors[0] ?? "Some profile details are still syncing.");
    }, CUSTOMER_LOAD_TIMEOUT_MS);

    let db: ReturnType<typeof getFirebaseDb> | null = null;

    const attachQuery = <T extends { id: string }>(
      key: CustomerLoadKey,
      collectionName: string,
      constraints: QueryConstraint[],
      setter: (items: T[]) => void,
      errorMessage: string,
    ) => {
      if (!db) throw new Error("Firestore is not ready.");
      unsubscribers.push(onSnapshot(
        query(collection(db, collectionName), ...constraints),
        (snapshot) => {
          if (!active) return;
          setter(mapDocs<T>(snapshot.docs));
          markLoaded(key);
        },
        () => {
          if (!active) return;
          setter([]);
          noteError(errorMessage);
          markLoaded(key);
        },
      ));
    };

    try {
      db = getFirebaseDb();
      unsubscribers.push(onSnapshot(
        doc(db, COLLECTIONS.customerProfiles, customerId),
        (snapshot) => {
          if (!active) return;
          setProfile(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as CustomerProfileDoc) : null);
          markLoaded("profile");
        },
        () => {
          if (!active) return;
          setProfile(null);
          noteError("Could not load profile details.");
          markLoaded("profile");
        },
      ));

      attachQuery<CustomerAddressDoc>(
        "addresses",
        COLLECTIONS.customerAddresses,
        [where("customerId", "==", customerId), limit(20)],
        setAddresses,
        "Could not load saved addresses.",
      );

      attachQuery<CustomerOrderDoc>(
        "orders",
        COLLECTIONS.customerOrders,
        [where("customerId", "==", customerId), orderBy("createdAt", "desc"), limit(20)],
        setOrders,
        "Could not load order history.",
      );

      unsubscribers.push(onSnapshot(
        query(collection(db, COLLECTIONS.customerLoyalty), where("customerId", "==", customerId), limit(1)),
        (snapshot) => {
          if (!active) return;
          setLoyalty(snapshot.docs[0] ? ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CustomerLoyaltyDoc) : null);
          markLoaded("loyalty");
        },
        () => {
          if (!active) return;
          setLoyalty(null);
          noteError("Could not load rewards.");
          markLoaded("loyalty");
        },
      ));

      attachQuery<CustomerPaymentMethodDoc>(
        "payments",
        COLLECTIONS.customerPaymentMethods,
        [where("customerId", "==", customerId), limit(20)],
        setPayments,
        "Could not load payment methods.",
      );

      attachQuery<CustomerSavedRestaurantDoc>(
        "savedRestaurants",
        COLLECTIONS.customerSavedRestaurants,
        [where("customerId", "==", customerId), limit(30)],
        setSavedRestaurants,
        "Could not load saved restaurants.",
      );

      attachQuery<CustomerCouponDoc>(
        "coupons",
        COLLECTIONS.customerCoupons,
        [where("customerId", "==", customerId), limit(30)],
        setCoupons,
        "Could not load coupons.",
      );

      attachQuery<CustomerReviewDoc>(
        "reviews",
        COLLECTIONS.customerReviews,
        [where("customerId", "==", customerId), limit(50)],
        setReviews,
        "Could not load reviews.",
      );
    } catch {
      window.clearTimeout(startTimerId);
      window.clearTimeout(timeoutId);
      loadKeys.forEach((key) => {
        loaded[key] = true;
      });
      const failTimerId = window.setTimeout(() => {
        if (!active) return;
        setStatus("error");
        setError("Could not connect to customer data.");
      }, 0);
      unsubscribers.push(() => window.clearTimeout(failTimerId));
    }

    return () => {
      active = false;
      window.clearTimeout(startTimerId);
      window.clearTimeout(timeoutId);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [customerId, version]);

  return {
    profile,
    addresses,
    orders,
    loyalty,
    payments,
    savedRestaurants,
    coupons,
    reviews,
    status,
    error,
    retry,
  };
}
