import {
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/firebase/client";
import { refs, typedDoc } from "@/firebase/collections";
import { FIRESTORE_LIMITS } from "@/lib/constants";
import { getPage, listenToQueryShared } from "@/services/firestore-query";
import type { DeliveryDoc } from "@/types/firebase";

export function listenToPartnerDeliveries(
  partnerId: string,
  callback: (deliveries: DeliveryDoc[]) => void,
): Unsubscribe {
  const q = query(
    refs.deliveries(getFirebaseDb()),
    where("partnerId", "==", partnerId),
    where("status", "in", ["assigned", "picked-up"]),
    orderBy("updatedAt", "desc"),
    limit(FIRESTORE_LIMITS.deliveryAssignments),
  );

  return listenToQueryShared(`partner-deliveries:${partnerId}`, q, callback);
}

export async function assignDelivery(deliveryId: string, partnerId: string) {
  await updateDoc(typedDoc<DeliveryDoc>(getFirebaseDb(), "deliveries", deliveryId), {
    partnerId,
    status: "assigned",
    updatedAt: serverTimestamp(),
  });
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryDoc["status"],
) {
  await updateDoc(typedDoc<DeliveryDoc>(getFirebaseDb(), "deliveries", deliveryId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function listDeliveryHistory(
  partnerId: string,
  pageSize = FIRESTORE_LIMITS.deliveryAssignments,
  cursor?: DocumentSnapshot<DeliveryDoc>,
) {
  const constraints: QueryConstraint[] = [
    where("partnerId", "==", partnerId),
    orderBy("updatedAt", "desc"),
  ];
  return getPage(refs.deliveries(getFirebaseDb()), constraints, pageSize, cursor);
}
