"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAppStore } from "@/lib/app-store";

type CustomerAuthContextValue = {
  userId: string;
  name: string;
  signedIn: boolean;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const authUser = useAppStore((state) => state.authUser);
  const signedIn = authUser.role === "customer" && authUser.id !== "anonymous";

  return (
    <CustomerAuthContext.Provider value={{ userId: authUser.id, name: authUser.name, signedIn }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuthContext() {
  const value = useContext(CustomerAuthContext);
  if (!value) {
    throw new Error("useCustomerAuthContext must be used inside CustomerAuthProvider.");
  }
  return value;
}
