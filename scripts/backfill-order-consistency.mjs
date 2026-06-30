import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const apply = process.argv.includes("--apply");
const { cert, getApps, initializeApp } = await import("firebase-admin/app");
const { FieldValue, getFirestore } = await import("firebase-admin/firestore");

const accountPath = join(process.cwd(), "service-account-key.json");
if (!existsSync(accountPath)) throw new Error("service-account-key.json is required for order consistency backfill.");
const account = JSON.parse(readFileSync(accountPath, "utf8"));
const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key }), projectId: account.project_id });
const db = getFirestore(app);
const collections = ["orders", "customerOrders", "kitchenOrders"];
let touched = 0;
let scanned = 0;

for (const collection of collections) {
  const rows = await readAll(collection);
  scanned += rows.length;
  const writes = [];
  for (const { id, data } of rows) {
    const patch = patchFor(collection, data);
    if (Object.keys(patch).length) writes.push({ ref: db.collection(collection).doc(id), patch });
  }
  touched += writes.length;
  console.log(`${collection}: ${writes.length}/${rows.length} documents need consistency fields.`);
  if (apply) {
    for (let index = 0; index < writes.length; index += 450) {
      const batch = db.batch();
      for (const write of writes.slice(index, index + 450)) batch.set(write.ref, write.patch, { merge: true });
      await batch.commit();
    }
  }
}

console.log(`${apply ? "Applied" : "Dry run"} order consistency backfill: ${touched}/${scanned} documents in ${account.project_id}.`);

async function readAll(collection) {
  const rows = [];
  let cursor;
  do {
    let query = db.collection(collection).limit(400);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    rows.push(...snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })));
    cursor = snapshot.docs.at(-1);
  } while (cursor);
  return rows;
}

function patchFor(collection, data) {
  const now = new Date();
  const status = String(data.status || "new");
  const foodStatus = collection === "kitchenOrders" ? status : orderStatusToFoodStatus(status);
  const patch = {};
  if (!data.foodStatus) patch.foodStatus = foodStatus;
  if (!data.paymentStatus) patch.paymentStatus = "pending";
  if (!Array.isArray(data.statusHistory) || !data.statusHistory.length) {
    patch.statusHistory = [{ status, foodStatus, paymentStatus: data.paymentStatus || "pending", at: data.createdAt || now, by: data.customerId || data.ownerId || "system" }];
  }
  if (typeof data.preparedBy === "undefined") patch.preparedBy = "";
  if (typeof data.servedBy === "undefined") patch.servedBy = "";
  if (typeof data.completedBy === "undefined") patch.completedBy = "";
  if (typeof data.printedCount === "undefined") patch.printedCount = 0;
  if (typeof data.lastPrintedAt === "undefined") patch.lastPrintedAt = null;
  if (!data.createdAt) patch.createdAt = FieldValue.serverTimestamp();
  if (!data.updatedAt) patch.updatedAt = FieldValue.serverTimestamp();
  return patch;
}

function orderStatusToFoodStatus(status) {
  if (status === "accepted") return "accepted";
  if (status === "preparing") return "preparing";
  if (status === "ready" || status === "picked-up") return "ready";
  if (status === "served" || status === "delivered") return "served";
  if (status === "completed") return "completed";
  if (status === "cancelled" || status === "rejected") return "cancelled";
  return "new";
}
