import { z } from "zod";

export const cateringInquirySchema = z.object({
  customerName: z.string().min(2),
  phone: z.string().min(10),
  eventDate: z.string().min(1),
  guestCount: z.coerce.number().int().min(10),
  packageId: z.string().min(1),
  notes: z.string().optional(),
});

export type CateringInquiryValues = z.infer<typeof cateringInquirySchema>;
