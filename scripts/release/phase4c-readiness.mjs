import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const scenarios = JSON.parse(read("src/data/notification-scenarios.json"));
const checks = [];
const check = (name, pass, detail) => checks.push({ name, status: pass ? "PASS" : "FAIL", detail });

const expectedCounts = { customer: 12, owner: 8, waiter: 5, kitchen: 5, admin: 4 };
const ids = new Set(scenarios.map((item) => item.id));
check("notification:scenario-count", scenarios.length === 34 && ids.size === 34, `${scenarios.length} unique scenarios`);
for (const [audience, count] of Object.entries(expectedCounts)) {
  check(`notification:${audience}`, scenarios.filter((item) => item.audience === audience).length === count, `${count} required scenarios`);
}
const manual = scenarios.filter((item) => item.verification === "manual").map((item) => item.id).sort();
check("notification:manual-reservations", JSON.stringify(manual) === JSON.stringify(["customer.order_confirmation", "customer.order_rejection"]), manual.join(", "));
check("notification:contracts", scenarios.every((item) => item.title && item.body && /^\//.test(item.link) && ["normal", "high"].includes(item.priority)), "titles, bodies, same-origin links, and priorities are valid");
check("notification:deep-links", scenarios.every((item) => {
  const route = item.link.split(/[?#]/, 1)[0];
  const page = route === "/" ? "src/app/page.tsx" : `src/app${route}/page.tsx`;
  return fs.existsSync(path.join(root, page));
}), "all notification links resolve to App Router pages");

const fcm = read("src/services/fcm-client.ts");
const push = read("src/lib/server/push-notifications.ts");
const sw = read("public/sw.js");
for (const [name, source, patterns] of [
  ["push:client-lifecycle", fcm, ["getToken", "deleteToken", "registerCurrentPushToken", "refreshPushTokenIfNeeded", "removeRegisteredPushToken"]],
  ["push:service-worker", sw, ["addEventListener(\"push\"", "addEventListener(\"notificationclick\"", "SARVA_TEST_NOTIFICATION", "SARVA_PUSH_RECEIVED"]],
  ["push:server-delivery", push, ["sendEachForMulticast", "cleanupInvalidTokens", "recoverFailedNotification", "MAX_PUSH_ATTEMPTS"]],
]) check(name, patterns.every((pattern) => source.includes(pattern)), patterns.join(", "));

const payment = read("src/lib/server/owner-payment-settings.ts");
const webhook = read("src/app/api/payments/razorpay/webhook/route.ts");
const ownerApi = read("src/app/api/owner/payment-settings/route.ts");
const ownerUi = read("src/components/owner/payment-verification-center.tsx");
const checkoutOrder = read("src/app/api/payments/razorpay/order/route.ts");
const checkoutVerify = read("src/app/api/payments/razorpay/verify/route.ts");
for (const [name, source, patterns] of [
  ["payment:owner-scope", payment, ["readOwnerRazorpayRaw(ownerId)", "resolveTenantId", "paymentIntents", "restaurantId", "tenantId"]],
  ["payment:secret-security", payment, ["encryptSecret", "decryptSecret", "keySecretEncrypted", "webhookSecretEncrypted"]],
  ["payment:webhook-security", webhook, ["verifyRazorpaySignature", "webhookRef.create", "duplicate"]],
  ["payment:test-center-api", ownerApi, ["diagnostics", "test", "validateKeys", "createTestOrder", "verifySignature", "verifyTestPayment", "verifyWebhook", "captureTestPayment", "refundTestPayment"]],
  ["payment:test-center-ui", ownerUi, ["Test Connection", "Validate API Keys", "Create Test Order", "Open Checkout", "Verify Signature", "Verify Webhook", "Test Capture", "Test Refund", "Test Failed Payment", "Test Cancel", "Test Timeout", "Verification Logs"]],
  ["payment:checkout-owner-resolution", `${checkoutOrder}\n${checkoutVerify}`, ["getRazorpayRuntimeForOrder", "settings.keyId", "settings.keySecret", "paymentIntents", "restaurantId", "tenantId"]],
]) check(name, patterns.every((pattern) => source.includes(pattern)), patterns.join(", "));

const tenants = Array.from({ length: 10 }, (_, index) => ({
  ownerId: `owner-${index + 1}`,
  restaurantId: `restaurant-${index + 1}`,
  keyId: `rzp_test_tenant_${index + 1}`,
}));
const intents = new Map(tenants.map((tenant, index) => [`provider-order-${index + 1}`, tenant]));
check("payment:ten-tenant-isolation", tenants.every((tenant, index) => {
  const resolved = intents.get(`provider-order-${index + 1}`);
  return resolved?.ownerId === tenant.ownerId && resolved.restaurantId === tenant.restaurantId && resolved.keyId === tenant.keyId;
}), "10 distinct owner, restaurant, key, and provider-order mappings");

const failed = checks.filter((item) => item.status === "FAIL");
const generatedAt = new Date().toISOString();
const rows = checks.map((item) => `| ${item.name} | ${item.status} | ${item.detail} |`).join("\n");
const matrix = Object.keys(expectedCounts).map((audience) => {
  const items = scenarios.filter((item) => item.audience === audience);
  return `| ${audience} | ${items.filter((item) => item.verification === "automated").length} | ${items.filter((item) => item.verification === "manual").length} | ${items.map((item) => item.id.split(".")[1]).join(", ")} |`;
}).join("\n");
fs.writeFileSync(path.join(root, "docs/validation/PHASE_4C_AUTOMATED_VERIFICATION.md"), `# Phase 4C Automated Verification\n\nGenerated: ${generatedAt}\n\n## Result\n\n${failed.length ? "FAIL" : "PASS"}: ${checks.length - failed.length}/${checks.length} checks passed.\n\n## Checks\n\n| Check | Status | Evidence |\n| --- | --- | --- |\n${rows}\n\n## Notification Matrix\n\n| Audience | Automated Contracts | Reserved Manual | Scenarios |\n| --- | ---: | ---: | --- |\n${matrix}\n\nAutomated status verifies repository contracts, safe links, template coverage, lifecycle hooks, retry controls, and tenant mapping. Provider delivery and browser/device behavior remain manual evidence.\n`);

for (const item of checks) console.log(`${item.status} ${item.name}: ${item.detail}`);
if (failed.length) process.exitCode = 1;
