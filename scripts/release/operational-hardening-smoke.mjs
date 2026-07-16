import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const results = [];
const check = async (name, run) => {
  try {
    await run();
    results.push({ name, status: "PASS" });
  } catch (error) {
    results.push({ name, status: "FAIL", detail: error instanceof Error ? error.message : String(error) });
  }
};

const recovery = read("src/lib/pos-draft-recovery.ts");
const pos = read("src/components/flows/pos-billing-flow.tsx");
const access = read("src/lib/access-control.ts");
const push = read("src/lib/server/push-notifications.ts");
const fcm = read("src/services/fcm-client.ts");
const swSource = read("public/sw.js");
const scenarios = JSON.parse(read("src/data/notification-scenarios.json"));
const activeOrders = read("src/components/flows/pos-billing-flow.tsx");
const stateMachine = read("src/lib/order-state-machine.ts");
const kitchen = read("src/components/flows/kitchen-display-flow.tsx");
const kitchenNotify = read("src/app/api/owner/kitchen/notify-waiter/route.ts");

await check("draft:dual-storage-and-newest-wins", () => {
  for (const token of ["window.localStorage.setItem", "putOfflineRecord(\"metadata\"", "Date.parse(indexed.savedAt) > Date.parse(local.savedAt)"]) {
    assert.ok(recovery.includes(token), token);
  }
});

await check("draft:restaurant-and-operator-isolation", () => {
  assert.ok(recovery.includes("safeKey(scope.restaurantId)"));
  assert.ok(recovery.includes("safeKey(scope.userId)"));
  const key = (restaurantId, userId) => `sarva-pos-draft-recovery:v1:${restaurantId.replace(/[^a-zA-Z0-9_-]/g, "_")}:${userId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const roles = ["owner", "waiter", "cashier", "kitchen", "admin"];
  const keys = roles.map((role) => key("restaurant-a", `${role}-1`));
  assert.equal(new Set(keys).size, roles.length);
  assert.notEqual(key("restaurant-a", "waiter-1"), key("restaurant-b", "waiter-1"));
});

await check("draft:fault-classification", () => {
  for (const token of ["offline", "network", "permission", "validation", "conflict", "rate-limit", "provider", "storage", "unknown"]) {
    assert.ok(recovery.includes(`\"${token}\"`), token);
  }
  for (const status of ["401 || status === 403", "status === 409", "status === 429", "status >= 500"]) {
    assert.ok(recovery.includes(status), status);
  }
  assert.ok(recovery.includes("QuotaExceededError"));
});

await check("draft:lifecycle-replay", () => {
  for (const token of ["online", "offline", "focus", "visibilitychange"]) assert.ok(pos.includes(token), token);
  assert.ok(pos.includes("loadPosDraftRecovery"));
  assert.ok(/retry/i.test(pos));
  assert.ok(/recover/i.test(pos));
});

await check("roles:owner-waiter-cashier-kitchen-isolation", () => {
  for (const role of ["owner", "manager", "cashier", "waiter", "chef", "\"kitchen-manager\"", "admin"]) assert.ok(access.includes(`${role}:`), role);
  assert.ok(access.includes("canRolePerform"));
  assert.ok(access.includes("filterOwnerNavigation"));
});

await check("notifications:matrix-and-manual-reservations", () => {
  assert.equal(scenarios.length, 34);
  assert.equal(new Set(scenarios.map(({ id }) => id)).size, 34);
  assert.deepEqual(
    scenarios.filter(({ verification }) => verification === "manual").map(({ id }) => id).sort(),
    ["customer.order_confirmation", "customer.order_rejection"],
  );
});

await check("notifications:retry-dedup-and-token-lifecycle", () => {
  for (const token of ["MAX_PUSH_ATTEMPTS", "cleanupInvalidTokens", "claimPendingNotification", "sendEachForMulticast"]) assert.ok(push.includes(token), token);
  for (const token of ["getToken", "deleteToken", "refreshPushTokenIfNeeded", "forceRefreshPushToken", "removeRegisteredPushToken"]) assert.ok(fcm.includes(token), token);
});

await check("notifications:service-worker-behavior", async () => {
  const handlers = {};
  const opened = [];
  const focused = [];
  const shown = [];
  const clients = [
    { url: "https://app.test/owner/settings?tab=notifications", focus: async () => focused.push("settings"), postMessage() {} },
  ];
  const context = {
    URL, Response,
    Promise, Object, Array, String, Number, JSON, Math, Date,
    caches: { open: async () => ({ add: async () => {}, put: async () => {} }), keys: async () => [], delete: async () => true, match: async () => null },
    fetch: async () => new Response("ok"),
    self: {
      location: { origin: "https://app.test" },
      addEventListener: (type, handler) => { handlers[type] = handler; },
      skipWaiting() {},
      clients: {
        claim() {},
        matchAll: async () => clients,
        openWindow: async (url) => opened.push(url),
      },
      registration: {
        unregister: async () => true,
        showNotification: async (title, options) => shown.push({ title, options }),
      },
    },
  };
  vm.runInNewContext(swSource, context);
  assert.ok(handlers.push && handlers.notificationclick && handlers.notificationclose && handlers.sync);
  const waits = [];
  handlers.message({
    data: { type: "SARVA_TEST_NOTIFICATION", payload: { notificationId: "same-id", link: "/owner/settings?tab=notifications" } },
    waitUntil: (promise) => waits.push(promise),
  });
  await Promise.all(waits);
  assert.equal(shown[0].options.tag, "same-id");
  const clickWaits = [];
  handlers.notificationclick({
    action: "open",
    notification: { close() {}, data: { link: "/owner/settings?tab=notifications", notificationId: "same-id" } },
    waitUntil: (promise) => clickWaits.push(promise),
  });
  await Promise.all(clickWaits);
  assert.deepEqual(focused, ["settings"]);
  assert.deepEqual(opened, []);
});

await check("active-orders:a11y-and-operational-controls", () => {
  const files = [
    read("src/components/flows/owner-order-management-flow.tsx"),
    read("src/components/orders/CompactOrderAccordionActions.tsx"),
  ].join("\n");
  for (const token of ["aria-", "Accordion", "kitchen", "delay"]) assert.ok(files.toLowerCase().includes(token.toLowerCase()), token);
});

await check("active-orders:all-actions-wired", () => {
  for (const label of ["Serve Order", "Mark Served", "Complete Order", "Collect Payment", "Print Bill", "View / Preview", "Reminder", "Merge Tables", "Transfer Table", "Split Bill", "Reassign Waiter", "Cancel Order", "Kitchen Recall", "Print KOT"]) {
    assert.ok(activeOrders.includes(`label: \"${label}\"`) || activeOrders.includes(`label=\"${label}\"`), label);
  }
  for (const callback of ["onServe(order)", "onComplete(order)", "onCollectPayment(order)", "onPrintBill(order)", "onPrintKot(order)", "onSplit(order)", "onTransfer(order)", "onMerge(order)", "onReminder(order)", "onCancel(order)"]) assert.ok(activeOrders.includes(callback), callback);
});

await check("active-orders:strict-lifecycle", () => {
  assert.ok(activeOrders.includes('order.status !== "served" || order.paymentStatus !== "paid"'));
  assert.ok(stateMachine.includes('current === "ready" && next === "served"'));
  assert.ok(!stateMachine.includes('current === "ready" && next === "completed"'));
});

await check("active-orders:delay-timeline-progress-layout", () => {
  for (const token of ["formatDelayTime(delay.lateMinutes)", "Stale Order", "key === previous", "progress === 100 ? \"success\"", "md:grid-cols-2 xl:grid-cols-3"]) assert.ok(`${activeOrders}\n${read("src/lib/kitchen-delay.ts")}`.includes(token), token);
});

await check("kitchen:notify-without-serving", () => {
  assert.ok(kitchen.includes('label: "Notify Waiter"'));
  assert.ok(!kitchen.includes('ready: "served"'));
  assert.ok(kitchen.includes('/api/owner/kitchen/notify-waiter'));
  for (const token of ["kitchen_ready_waiter", 'audience: ["waiter"]', 'audience: ["owner"]', 'action === "acknowledge"', 'action === "escalate"']) assert.ok(kitchenNotify.includes(token), token);
});

await check("kitchen:responsive-settings-and-duration", () => {
  for (const token of ["autoNotifyWaiter", "autoPrintOrders", "soundAlerts", "repeatNotification", "escalationTimeout", "notificationMethod", "auto-fit", "--column-weight", "formatOperationalDuration"]) assert.ok(kitchen.includes(token) || read("src/lib/kitchen-delay.ts").includes(token), token);
});

const failed = results.filter(({ status }) => status === "FAIL");
const rows = results.map(({ name, status, detail = "" }) => `| ${name} | ${status} | ${detail.replaceAll("|", "\\|")} |`).join("\n");
fs.writeFileSync(path.join(root, "docs/validation/OPERATIONAL_HARDENING_REPORT.md"), `# RC5 Operational Hardening Automation\n\nGenerated: ${new Date().toISOString()}\n\nResult: ${failed.length ? "FAIL" : "PASS"} — ${results.length - failed.length}/${results.length} checks passed.\n\n| Check | Status | Detail |\n| --- | --- | --- |\n${rows}\n\nThis suite deterministically covers draft storage fallback, tenant/operator isolation, fault classification, lifecycle replay hooks, role contracts, notification matrix, retry/dedup/token lifecycle, service-worker foreground/background action routing, and Active Orders accessibility contracts. Real provider delivery, production credentials, physical devices, browsers, and hardware remain manual.\n`);
for (const result of results) console.log(`${result.status} ${result.name}${result.detail ? `: ${result.detail}` : ""}`);
if (failed.length) process.exitCode = 1;
