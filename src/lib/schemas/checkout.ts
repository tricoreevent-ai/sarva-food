import { z } from "zod";

export const checkoutSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Enter a reachable phone number"),
  address: z.string().optional(),
  fulfillmentType: z.enum(["delivery", "parcel"]).default("delivery"),
  scheduleMode: z.enum(["now", "scheduled"]).default("now"),
  scheduledFor: z.string().optional(),
  guestCount: z.coerce.number().int().min(1).max(500).optional(),
  payment: z.enum(["upi", "card", "cod"]),
  acceptedTerms: z.boolean().refine(Boolean, "Accept the terms and privacy policy to place the order"),
}).superRefine((value, context) => {
  if (value.fulfillmentType === "delivery" && (!value.address || value.address.trim().length < 8)) {
    context.addIssue({
      code: "custom",
      path: ["address"],
      message: "Delivery address is required",
    });
  }
  if (value.scheduleMode === "scheduled" && !value.scheduledFor) {
    context.addIssue({
      code: "custom",
      path: ["scheduledFor"],
      message: "Choose a date and time for the scheduled order",
    });
  }
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
