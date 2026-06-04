import type { CustomerAddressDoc } from "@/types/firebase";

export type LocalProfileDraft = {
  displayName?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
};

export const CUSTOMER_LOCAL_ADDRESSES_EVENT = "sarva-customer-local-addresses-updated";
export const CUSTOMER_LOCAL_PROFILE_EVENT = "sarva-customer-local-profile-updated";

export function localProfileKey(customerId: string) {
  return `sarva-local-profile-${customerId}`;
}

export function localAddressesKey(customerId: string) {
  return `sarva-local-addresses-${customerId}`;
}

export function readLocalProfile(customerId: string): LocalProfileDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(localProfileKey(customerId));
    return raw ? (JSON.parse(raw) as LocalProfileDraft) : null;
  } catch {
    return null;
  }
}

export function writeLocalProfile(customerId: string, profile: LocalProfileDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localProfileKey(customerId), JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(CUSTOMER_LOCAL_PROFILE_EVENT, { detail: { customerId } }));
}

export function readLocalAddresses(customerId: string): CustomerAddressDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(localAddressesKey(customerId));
    return raw ? (JSON.parse(raw) as CustomerAddressDoc[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalAddresses(customerId: string, addresses: CustomerAddressDoc[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localAddressesKey(customerId), JSON.stringify(addresses));
  window.dispatchEvent(new CustomEvent(CUSTOMER_LOCAL_ADDRESSES_EVENT, { detail: { customerId } }));
}
