import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/firebase/client";
import { refs, typedDoc } from "@/firebase/collections";
import { withTenantId } from "@/lib/tenant";
import type { CateringRequestDoc } from "@/types/firebase";

export async function createCateringRequest(
  input: Omit<CateringRequestDoc, "id" | "createdAt" | "updatedAt" | "status">,
) {
  const db = getFirebaseDb();
  const requestRef = doc(refs.cateringRequests(db));
  const request: CateringRequestDoc = {
    id: requestRef.id,
    ...withTenantId(input),
    status: "new",
    createdAt: serverTimestamp() as CateringRequestDoc["createdAt"],
    updatedAt: serverTimestamp() as CateringRequestDoc["updatedAt"],
  };
  await setDoc(requestRef, request);
  return request;
}

export async function updateCateringQuote(requestId: string, quotedTotal: number) {
  await updateDoc(
    typedDoc<CateringRequestDoc>(getFirebaseDb(), "cateringRequests", requestId),
    {
      quotedTotal,
      quotation: {
        subtotal: quotedTotal,
        serviceFee: 0,
        total: quotedTotal,
        sentAt: serverTimestamp(),
      },
      status: "quoted",
      updatedAt: serverTimestamp(),
    },
  );
}

export async function convertCateringRequestToOrder(requestId: string, orderId: string) {
  await updateDoc(
    typedDoc<CateringRequestDoc>(getFirebaseDb(), "cateringRequests", requestId),
    {
      convertedOrderId: orderId,
      status: "converted",
      updatedAt: serverTimestamp(),
    },
  );
}
