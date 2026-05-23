import { z } from "zod";

export const printerProfileSchema = z.object({
  name: z.string().trim().min(2),
  type: z.enum(["billing", "kitchen", "bar"]),
  branchId: z.string().min(1),
  paperWidth: z.enum(["58mm", "80mm", "100mm", "label", "A4"]),
  connection: z.enum(["usb", "bluetooth", "ethernet", "browser", "escpos"]),
  copies: z.coerce.number().int().min(1).max(5),
  autoCut: z.boolean(),
  encoding: z.enum(["utf-8", "cp437", "cp858"]),
  marginMm: z.coerce.number().min(0).max(12),
  fontScale: z.enum(["compact", "normal", "large"]),
});

export const printTemplateSchema = z.object({
  name: z.string().trim().min(2),
  branchId: z.string().min(1),
  type: z.enum(["bill", "receipt", "kot"]),
  paperWidth: z.enum(["58mm", "80mm", "100mm", "label", "A4"]),
  mode: z.enum(["compact", "standard", "premium", "branded"]),
  logoUrl: z.string().optional(),
  footerImageUrl: z.string().optional(),
  brandName: z.string().optional(),
  showLogo: z.boolean(),
  showGstBreakup: z.boolean(),
  showQrCode: z.boolean(),
  showFooter: z.boolean(),
  showWaiterName: z.boolean(),
  showItemNotes: z.boolean(),
  showBranch: z.boolean(),
  footerNote: z.string().max(140).optional(),
  refundPolicy: z.string().max(140).optional(),
  language: z.enum(["en", "hi", "ml"]).optional(),
});

export const billTotalsSchema = z
  .object({
    subtotal: z.number().min(0),
    discount: z.number().min(0),
    serviceCharge: z.number().min(0),
    packingCharge: z.number().min(0),
    cgst: z.number().min(0),
    sgst: z.number().min(0),
    igst: z.number().min(0),
    total: z.number().min(0),
    tenderedAmount: z.number().min(0),
  })
  .refine((value) => value.tenderedAmount >= value.total, "Tendered amount cannot be below bill total");

export const paymentBreakdownSchema = z
  .array(z.object({
    method: z.enum(["cash", "card", "upi"]),
    amount: z.coerce.number().min(0),
    reference: z.string().optional(),
  }))
  .min(1)
  .refine((payments) => payments.reduce((sum, item) => sum + item.amount, 0) > 0, "Payment amount is required");

export const splitBillSchema = z.object({
  mode: z.enum(["item", "quantity", "guest"]),
  guestCount: z.coerce.number().int().min(1).max(30),
  selectedItemIds: z.array(z.string()).default([]),
  paidAmount: z.coerce.number().min(0),
});
