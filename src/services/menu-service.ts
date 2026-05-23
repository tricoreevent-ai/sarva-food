import {
  doc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseDb, getFirebaseStorage } from "@/firebase/client";
import { refs, typedDoc } from "@/firebase/collections";
import { CACHE_TTL, FIRESTORE_LIMITS } from "@/lib/constants";
import { compressImageFile } from "@/lib/image-optimization";
import { resolveTenantId, withTenantId } from "@/lib/tenant";
import { createMetadata, softDeleteMetadata, updateMetadata } from "@/services/firestore-metadata";
import { getCachedQuery } from "@/services/firestore-query";
import type { MenuDoc } from "@/types/firebase";

export async function listMenuItems(restaurantId: string, pageSize = FIRESTORE_LIMITS.menuItems) {
  const q = query(
    refs.menus(getFirebaseDb()),
    where("tenantId", "==", resolveTenantId(restaurantId)),
    orderBy("sortOrder", "asc"),
    limit(pageSize),
  );
  return getCachedQuery(`menus:${restaurantId}:${pageSize}`, q, CACHE_TTL.menu, {
    persist: true,
  });
}

export async function createMenuItem(input: Omit<MenuDoc, "id" | "createdAt" | "updatedAt">) {
  const db = getFirebaseDb();
  const menuRef = doc(refs.menus(db));
  const item: MenuDoc = {
    id: menuRef.id,
    ...withTenantId(input),
    ...createMetadata(input),
    createdAt: serverTimestamp() as MenuDoc["createdAt"],
    updatedAt: serverTimestamp() as MenuDoc["updatedAt"],
  };

  await setDoc(menuRef, item);
  return item;
}

export async function updateMenuItem(itemId: string, patch: Partial<MenuDoc>) {
  await updateDoc(typedDoc<MenuDoc>(getFirebaseDb(), "menus", itemId), {
    ...patch,
    ...updateMetadata(patch),
  });
}

export async function deleteMenuItem(itemId: string) {
  await updateDoc(typedDoc<MenuDoc>(getFirebaseDb(), "menus", itemId), softDeleteMetadata());
}

export async function setMenuAvailability(itemId: string, available: boolean) {
  await updateMenuItem(itemId, { available });
}

export async function uploadMenuImage(restaurantId: string, file: File) {
  const optimizedFile = await compressImageFile(file);
  const safeName = optimizedFile.name.replace(/[^a-zA-Z0-9.-]/g, "-");
  const imagePath = `restaurants/${restaurantId}/menu/${crypto.randomUUID()}-${safeName}`;
  const imageRef = ref(getFirebaseStorage(), imagePath);
  await uploadBytes(imageRef, optimizedFile, { contentType: optimizedFile.type });
  const downloadUrl = await getDownloadURL(imageRef);

  return { imagePath, downloadUrl };
}
