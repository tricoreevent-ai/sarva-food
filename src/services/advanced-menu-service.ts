import { addDoc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, type Unsubscribe } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/firebase/client";
import { refs, typedDoc } from "@/firebase/collections";
import { shouldUseFirebase } from "@/lib/env";
import { resolveTenantId, withTenantId } from "@/lib/tenant";
import { comboSchema, cuisineSchema, inventorySchema, menuCategorySchema, taxSettingsSchema, type MenuItemFormValues } from "@/lib/schemas/menu";
import { uploadImageToCloudinary } from "@/services/cloudinary-upload-service";
import { createMetadata, softDeleteMetadata, updateMetadata } from "@/services/firestore-metadata";
import type { ComboOfferDoc, CuisineDoc, InventoryDoc, MenuCategoryDoc, MenuDoc, ModifierGroupDoc, TaxSettingsDoc } from "@/types/firebase";

export function canUseMenuFirestore() {
  return shouldUseFirebase() && isFirebaseConfigured;
}

export function listenMenuItems(restaurantId: string, onData: (items: MenuDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  if (!canUseMenuFirestore()) return () => undefined;
  const q = query(refs.menus(getFirebaseDb()), where("tenantId", "==", resolveTenantId(restaurantId)), orderBy("sortOrder", "asc"), limit(150));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((item) => item.data()).filter((item) => !item.isDeleted)), (error) => onError?.(error));
}

export function listenMenuCategories(restaurantId: string, onData: (items: MenuCategoryDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  if (!canUseMenuFirestore()) return () => undefined;
  const q = query(refs.menuCategories(getFirebaseDb()), where("tenantId", "==", resolveTenantId(restaurantId)), orderBy("sortOrder", "asc"), limit(200));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((item) => item.data()).filter((item) => !item.isDeleted)), (error) => onError?.(error));
}

export function listenInventory(restaurantId: string, branchId: string, onData: (items: InventoryDoc[]) => void, onError?: (error: Error) => void): Unsubscribe {
  if (!canUseMenuFirestore()) return () => undefined;
  const q = query(refs.inventory(getFirebaseDb()), where("tenantId", "==", resolveTenantId(restaurantId)), where("branchId", "==", branchId), orderBy("itemName", "asc"), limit(250));
  return onSnapshot(q, (snapshot) => onData(snapshot.docs.map((item) => item.data()).filter((item) => !item.isDeleted)), (error) => onError?.(error));
}

export async function safeUpsertMenuItem(item: MenuDoc) {
  if (!canUseMenuFirestore()) return item;
  await setDoc(typedDoc<MenuDoc>(getFirebaseDb(), "menus", item.id), { ...withTenantId(item), ...updateMetadata(item), isDeleted: false }, { merge: true });
  return item;
}

export async function uploadMenuItemImage(restaurantId: string, file: File) {
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

export async function safeCreateCategory(input: Omit<MenuCategoryDoc, "id" | "createdAt" | "updatedAt">) {
  menuCategorySchema.parse({ name: input.name, enabled: input.active });
  if (!canUseMenuFirestore()) return null;
  return addDoc(refs.menuCategories(getFirebaseDb()), { ...withTenantId(input), ...createMetadata(input) } as Omit<MenuCategoryDoc, "id">);
}

export async function safeUpdateCategory(id: string, patch: Partial<MenuCategoryDoc>) {
  if (!canUseMenuFirestore()) return;
  await updateDoc(typedDoc<MenuCategoryDoc>(getFirebaseDb(), "menuCategories", id), { ...patch, ...updateMetadata(patch) });
}

export async function safeUpsertCuisine(cuisine: CuisineDoc) {
  cuisineSchema.parse({ name: cuisine.name, image: cuisine.imagePath ?? "", icon: cuisine.icon, enabled: cuisine.active });
  if (!canUseMenuFirestore()) return cuisine;
  await setDoc(typedDoc<CuisineDoc>(getFirebaseDb(), "cuisines", cuisine.id), { ...withTenantId(cuisine), ...updateMetadata(cuisine), isDeleted: false }, { merge: true });
  return cuisine;
}

export async function safeUpsertTaxSettings(settings: TaxSettingsDoc) {
  taxSettingsSchema.parse(settings);
  if (!canUseMenuFirestore()) return settings;
  await setDoc(typedDoc<TaxSettingsDoc>(getFirebaseDb(), "taxSettings", settings.id), { ...withTenantId(settings), ...updateMetadata(settings), isDeleted: false }, { merge: true });
  return settings;
}

export async function safeUpsertCombo(combo: ComboOfferDoc) {
  comboSchema.parse({ name: combo.name, itemIds: combo.itemIds, price: combo.price, discount: combo.discount, available: combo.active });
  if (!canUseMenuFirestore()) return combo;
  await setDoc(typedDoc<ComboOfferDoc>(getFirebaseDb(), "comboOffers", combo.id), { ...withTenantId(combo), ...updateMetadata(combo), isDeleted: false }, { merge: true });
  return combo;
}

export async function safeDeleteMenuItem(itemId: string) {
  if (!canUseMenuFirestore()) return;
  await updateDoc(typedDoc<MenuDoc>(getFirebaseDb(), "menus", itemId), softDeleteMetadata());
}

export async function safeUpsertModifierGroup(group: ModifierGroupDoc) {
  if (!canUseMenuFirestore()) return group;
  await setDoc(typedDoc<ModifierGroupDoc>(getFirebaseDb(), "modifierGroups", group.id), { ...withTenantId(group), ...updateMetadata(group), isDeleted: false }, { merge: true });
  return group;
}

export async function safeUpsertInventory(item: InventoryDoc) {
  inventorySchema.parse({
    name: item.itemName,
    category: item.category ?? item.status,
    branchId: item.branchId ?? "default",
    currentStock: item.quantity,
    unit: item.unit,
    reorderLevel: item.reorderAt,
  });
  if (!canUseMenuFirestore()) return item;
  await setDoc(typedDoc<InventoryDoc>(getFirebaseDb(), "inventory", item.id), { ...withTenantId(item), ...updateMetadata(item), isDeleted: false }, { merge: true });
  return item;
}

export async function safeBulkUpdateMenuPrices(items: Array<Pick<MenuDoc, "id" | "price" | "dineInPrice" | "parcelPrice" | "deliveryPrice">>) {
  if (!canUseMenuFirestore()) return items.length;
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  items.slice(0, 450).forEach((item) => {
    batch.set(typedDoc<MenuDoc>(db, "menus", item.id), { ...item, ...updateMetadata(item) } as Partial<MenuDoc>, { merge: true });
  });
  await batch.commit();
  return Math.min(items.length, 450);
}

export function buildMenuDoc(input: MenuItemFormValues & { id: string; tenantId?: string; restaurantId: string; sortOrder: number; isVeg: boolean }): MenuDoc {
  return {
    ...input,
    tenantId: resolveTenantId(input),
    createdAt: serverTimestamp() as MenuDoc["createdAt"],
    updatedAt: serverTimestamp() as MenuDoc["updatedAt"],
  };
}
