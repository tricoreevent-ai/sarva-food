import type { OrderDoc } from "@/types/firebase";

export type WhatsappMessageDraft = {
  to: string;
  template: "order-confirmation" | "status-update" | "delivery-otp";
  variables: Record<string, string>;
};

export function buildOrderConfirmationMessage(order: OrderDoc): WhatsappMessageDraft {
  return {
    to: order.customerPhone,
    template: "order-confirmation",
    variables: {
      orderId: order.id,
      total: String(order.total),
      status: order.status,
    },
  };
}

export function buildStatusUpdateMessage(order: OrderDoc): WhatsappMessageDraft {
  return {
    to: order.customerPhone,
    template: "status-update",
    variables: {
      orderId: order.id,
      status: order.status,
    },
  };
}

export function buildOtpMessage(order: OrderDoc): WhatsappMessageDraft {
  return {
    to: order.customerPhone,
    template: "delivery-otp",
    variables: {
      orderId: order.id,
      otp: order.deliveryOtp,
    },
  };
}

export async function sendWhatsappTemplateMessage(draft: WhatsappMessageDraft) {
  const response = await fetch("/api/whatsapp/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft),
  });

  if (!response.ok) {
    throw new Error("WhatsApp message queue failed.");
  }

  return response.json() as Promise<{ ok: true; eventId: string }>;
}

export function toWhatsappCloudTemplate(draft: WhatsappMessageDraft) {
  const templateName = draft.template.replaceAll("-", "_");
  return {
    messaging_product: "whatsapp",
    to: draft.to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: Object.values(draft.variables).map((text) => ({
            type: "text",
            text,
          })),
        },
      ],
    },
  };
}
