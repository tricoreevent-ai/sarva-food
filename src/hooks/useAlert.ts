"use client";

import { createContext, useContext } from "react";
import type { AlertApi } from "@/types/alert.types";

export const AlertContext = createContext<AlertApi | null>(null);

export function useAlert() {
  const value = useContext(AlertContext);
  if (!value) throw new Error("useAlert must be used inside AlertProvider.");
  return value;
}
