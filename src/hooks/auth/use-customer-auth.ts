"use client";

import { useCustomerAuthContext } from "@/context/auth/customer-auth-provider";

export function useCustomerAuth() {
  return useCustomerAuthContext();
}
