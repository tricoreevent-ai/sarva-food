import {
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  type CollectionReference,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import { invalidateCache } from "@/lib/cache";
import { createMetadata, softDeleteMetadata, updateMetadata } from "@/services/firestore-metadata";
import { getCachedDoc, getPage } from "@/services/firestore-query";

export function createRepository<T extends DocumentData & { id: string }>(
  db: Firestore,
  collectionRef: CollectionReference<T>,
  cachePrefix: string,
) {
  return {
    getById(id: string, ttlMs?: number) {
      return getCachedDoc<T>(cachePrefix, doc(collectionRef, id), ttlMs);
    },
    async set(value: T) {
      await setDoc(doc(collectionRef, value.id), {
        ...value,
        ...createMetadata(value),
      }, { merge: true });
      invalidateCache(cachePrefix);
    },
    async update(id: string, patch: Partial<T>) {
      await updateDoc(doc(collectionRef, id), {
        ...patch,
        ...updateMetadata(patch),
      });
      invalidateCache(cachePrefix);
    },
    async softDelete(id: string, patch?: Partial<T>) {
      await updateDoc(doc(collectionRef, id), {
        ...(patch ?? {}),
        ...softDeleteMetadata(patch),
      });
      invalidateCache(cachePrefix);
    },
    getPage(
      constraints: QueryConstraint[],
      pageSize: number,
      cursor?: DocumentSnapshot<T>,
    ) {
      return getPage(collectionRef, constraints, pageSize, cursor);
    },
    async batchSet(values: T[]) {
      const batch = writeBatch(db);
      values.forEach((value) => {
        batch.set(doc(collectionRef, value.id), {
          ...value,
          ...createMetadata(value),
        }, { merge: true });
      });
      await batch.commit();
      invalidateCache(cachePrefix);
    },
  };
}
