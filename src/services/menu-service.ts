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
import { getFirebaseDb } from "@/firebase/client";
import { refs, typedDoc } from "@/firebase/collections";
import { CACHE_TTL, FIRESTORE_LIMITS } from "@/lib/constants";
import { resolveTenantId, withTenantId } from "@/lib/tenant";
import { uploadImageToCloudinary } from "@/services/cloudinary-upload-service";
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
  return uploadImageToCloudinary(file, {
    folder: "menu",
    restaurantId,
    maxWidth: 1200,
    maxHeight: 900,
    aspectRatio: 4 / 3,
    quality: 0.82,
    type: "image/webp",
    tags: ["menu-item"],
  });
}
