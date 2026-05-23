import { addDoc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { refs, typedDoc } from "@/firebase/collections";
import { shouldUseFirebase } from "@/lib/env";
import { resolveTenantId, withTenantId } from "@/lib/tenant";
import { printerProfileSchema, printTemplateSchema } from "@/lib/schemas/printing";
import type { BillTemplateDoc, KotPrintQueueDoc, KotTemplateDoc, PaymentTransactionDoc, PrinterProfileDoc, PrintLogDoc, ReceiptDoc, ReceiptTemplateDoc } from "@/types/firebase";

export function canUsePrintingFirestore() {
  return shouldUseFirebase() && isFirebaseConfigured;
}

export function listenPrintLogs(restaurantId: string, branchId: string, onData: (logs: PrintLogDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  if (!canUsePrintingFirestore()) return () => undefined;
  const q = query(refs.printLogs(getFirebaseDb()), where("tenantId", "==", resolveTenantId(restaurantId)), where("branchId", "==", branchId), orderBy("createdAt", "desc"), limit(100));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((item) => item.data())), (error) => onError?.(error));
}

export async function safeUpsertPrinterProfile(profile: PrinterProfileDoc) {
  printerProfileSchema.parse(profile);
  if (!canUsePrintingFirestore()) return profile;
  await setDoc(typedDoc<PrinterProfileDoc>(getFirebaseDb(), "printerProfiles", profile.id), { ...withTenantId(profile), updatedAt: serverTimestamp() }, { merge: true });
  return profile;
}

export async function safeUpsertBillTemplate(template: BillTemplateDoc) {
  printTemplateSchema.parse({ ...template, type: "bill" });
  if (!canUsePrintingFirestore()) return template;
  await setDoc(typedDoc<BillTemplateDoc>(getFirebaseDb(), "billTemplates", template.id), { ...withTenantId(template), updatedAt: serverTimestamp() }, { merge: true });
  return template;
}

export async function safeUpsertKotTemplate(template: KotTemplateDoc) {
  printTemplateSchema.parse({ ...template, type: "kot" });
  if (!canUsePrintingFirestore()) return template;
  await setDoc(typedDoc<KotTemplateDoc>(getFirebaseDb(), "kotTemplates", template.id), { ...withTenantId(template), updatedAt: serverTimestamp() }, { merge: true });
  return template;
}

export async function safeUpsertReceiptTemplate(template: ReceiptTemplateDoc) {
  printTemplateSchema.parse({ ...template, type: "receipt" });
  if (!canUsePrintingFirestore()) return template;
  await setDoc(typedDoc<ReceiptTemplateDoc>(getFirebaseDb(), "receiptTemplates", template.id), { ...withTenantId(template), updatedAt: serverTimestamp() }, { merge: true });
  return template;
}

export async function safeLogPrint(log: Omit<PrintLogDoc, "id" | "createdAt" | "updatedAt">) {
  if (!canUsePrintingFirestore()) return null;
  return addDoc(refs.printLogs(getFirebaseDb()), { ...withTenantId(log), createdAt: serverTimestamp(), updatedAt: serverTimestamp() } as Omit<PrintLogDoc, "id">);
}

export async function safeCreateReceipt(receipt: ReceiptDoc) {
  if (!canUsePrintingFirestore()) return receipt;
  await setDoc(typedDoc<ReceiptDoc>(getFirebaseDb(), "receipts", receipt.id), { ...withTenantId(receipt), updatedAt: serverTimestamp() }, { merge: true });
  return receipt;
}

export async function safeCreatePaymentTransaction(payment: PaymentTransactionDoc) {
  if (!canUsePrintingFirestore()) return payment;
  await setDoc(typedDoc<PaymentTransactionDoc>(getFirebaseDb(), "paymentTransactions", payment.id), { ...withTenantId(payment), updatedAt: serverTimestamp() }, { merge: true });
  return payment;
}

export async function safeQueueKotPrint(entry: KotPrintQueueDoc) {
  if (!canUsePrintingFirestore()) return entry;
  await setDoc(typedDoc<KotPrintQueueDoc>(getFirebaseDb(), "kotPrintQueue", entry.id), { ...withTenantId(entry), updatedAt: serverTimestamp() }, { merge: true });
  return entry;
}
