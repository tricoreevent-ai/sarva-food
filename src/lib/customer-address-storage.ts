import type { CustomerAddressDoc } from "@/types/firebase";

export type LocalProfileDraft = {
  displayName?: string;
  email?: string;
  phone?: string;
  photoURL?: string;
};

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
}
