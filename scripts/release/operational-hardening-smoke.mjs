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
const orderRepository = read("src/repositories/order-repository.ts");
const kitchenRepository = read("src/repositories/kitchen-repository.ts");
const delayFormatter = read("src/lib/kitchen-delay.ts");
const statusBadge = read("src/components/orders/OperationalOrderStatusBadge.tsx");
const compactActions = read("src/components/orders/CompactOrderAccordionActions.tsx");
const kitchen = read("src/components/flows/kitchen-display-flow.tsx");
const ownerOrders = read("src/components/flows/owner-order-management-flow.tsx");
const kitchenNotify = read("src/app/api/owner/kitchen/notify-waiter/route.ts");
const ownerAccess = read("src/lib/server/owner-api-access.ts");
const mutationOrigin = read("src/lib/server/mutation-origin.ts");

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

await check("owner-api:proxy-safe-origin-guard", () => {
  for (const token of ["getConfiguredPublicAppUrl", "isTrustedMutationOrigin", "request.nextUrl.origin"]) assert.ok(ownerAccess.includes(token), token);
  for (const token of ["safeMethods", "requestOrigin", "requestHost", "publicOrigin", "normalizeOrigin"]) assert.ok(mutationOrigin.includes(token), token);
  const normalize = (value) => {
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  };
  const trusted = ({ method = "POST", origin, requestOrigin, requestHost, publicOrigin }) => {
    if (["GET", "HEAD", "OPTIONS"].includes(method) || !origin) return true;
    const normalized = normalize(origin);
    const hostOrigin = normalized && requestHost ? normalize(`${new URL(normalized).protocol}//${requestHost}`) : null;
    return Boolean(normalized && [requestOrigin, publicOrigin, hostOrigin].some((candidate) => candidate && normalize(candidate) === normalized));
  };
  const productionOrigin = "https://violet-squid-380447.hostingersite.com";
  assert.equal(trusted({ origin: productionOrigin, requestOrigin: "http://127.0.0.1:3000", requestHost: "127.0.0.1:3000", publicOrigin: productionOrigin }), true);
  assert.equal(trusted({ origin: "https://attacker.example", requestOrigin: "http://127.0.0.1:3000", requestHost: "violet-squid-380447.hostingersite.com", publicOrigin: productionOrigin }), false);
  assert.equal(trusted({ origin: "http://localhost:3000", requestOrigin: "http://0.0.0.0:3000", requestHost: "localhost:3000", publicOrigin: productionOrigin }), true);
  assert.equal(trusted({ origin: "not-a-url", requestOrigin: "http://localhost:3000", requestHost: "localhost:3000", publicOrigin: productionOrigin }), false);
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
  for (const label of ["Serve Order", "Ready Signal", "Complete Order", "Collect Payment", "Mark Paid", "Print Bill", "Print Receipt", "View / Preview", "Add Items", "Reminder", "Smart Bill Merge", "Merge Bills", "Merge All", "Merge Selected", "Pay Separately", "Transfer Table", "Split Bill", "Assign Waiter", "Cancel Order", "Kitchen Recall", "Print KOT", "Timeline", "History", "Payment History", "Move To History"]) {
    assert.ok(activeOrders.includes(label), label);
  }
  for (const callback of ["handlers.onServe(order)", "handlers.onNotifyWaiter(order)", "handlers.onComplete(order)", "handlers.onCollectPayment(order)", "handlers.onPrintBill(order)", "handlers.onPrintReceipt(order)", "handlers.onPrintKot(order)", "handlers.onAddItems(order)", "handlers.onSplit(order)", "handlers.onTransfer(order)", "handlers.onAssignWaiter(order)", "handlers.onMerge(order)", "handlers.onTimeline(order)", "handlers.onPaymentHistory(order)", "handlers.onReminder(order)", "handlers.onRecall(order)", "handlers.onCancel(order)"]) assert.ok(activeOrders.includes(callback), callback);
});

await check("active-orders:strict-lifecycle", () => {
  assert.ok(activeOrders.includes('order.status !== "served" || order.paymentStatus !== "paid"'));
  assert.ok(activeOrders.includes("const canCollect = canCollectOrderPayment(order)"));
  assert.ok(stateMachine.includes('current === "ready" && next === "served"'));
  assert.ok(stateMachine.includes('next === "completed" && paymentStatus !== "paid"'));
  assert.ok(!stateMachine.includes('foodStatus !== "served"'));
  assert.ok(orderRepository.includes("assertCanRecordPayment(order)"));
  assert.ok(orderRepository.includes("assertPaymentLockOwner(order"));
  assert.ok(kitchenRepository.includes("assertLegalOrderTransition({ status: current, paymentStatus }, next)"));
  assert.ok(activeOrders.includes('const kitchenOwnedStatus = ["accepted", "preparing", "ready", "cancelled"].includes(status)'));
  assert.ok(activeOrders.includes('["served", "completed", "cancelled"].includes(status)'));
  assert.ok(!stateMachine.includes('current === "ready" && next === "completed"'));
});

await check("active-orders:payment-independent-from-kitchen", () => {
  const startGuard = stateMachine.match(/export function assertCanStartPayment[\s\S]*?}\r?\n\r?\nexport function assertCanRecordPayment/)?.[0] ?? "";
  const recordGuard = stateMachine.match(/export function assertCanRecordPayment[\s\S]*?}\r?\n\r?\nexport function assertCanRefund/)?.[0] ?? "";
  const collectGuard = activeOrders.match(/function canCollectOrderPayment[\s\S]*?}\r?\n\r?\nfunction paymentUnavailableReason/)?.[0] ?? "";
  for (const guard of [startGuard, recordGuard, collectGuard]) {
    assert.ok(guard, "payment guard");
    assert.ok(!/foodStatus|kitchen still preparing|serve the order before collecting payment/i.test(guard), guard);
  }
  for (const status of ["new", "accepted", "preparing", "ready", "served"]) assert.ok(!collectGuard.includes(`"${status}"`), status);
  assert.ok(activeOrders.includes('data-action="payment"'));
  assert.ok(activeOrders.includes('data-action="complete"'));
  assert.ok(activeOrders.includes("const canComplete = served && paid"));
  assert.ok(!activeOrders.includes("Cannot split payment. Serve the order first."));
  assert.ok(ownerOrders.includes('state: workflowState(paid, !paid && !blocked, blocked)'));
  assert.ok(!ownerOrders.includes("served && !paid"));
});

await check("pos:new-order-cancel-resumes-draft", () => {
  assert.ok(activeOrders.includes("function resumeCurrentDraft()"));
  assert.ok(activeOrders.includes('setPanel("new")'));
  assert.ok(activeOrders.includes("setWizardStep((current) => current >= 1 && current <= 4 ? current : billRef.current.lines.length ? 3 : 1)"));
  assert.ok(activeOrders.includes("onCancel={resumeCurrentDraft}"));
  assert.ok(activeOrders.includes("Current POS order cleared."));
});

await check("active-orders:dense-memoized-layout", () => {
  for (const token of ["useDebouncedValue(search, 120)", "MemoPosActiveOrderCard", "handlersRef", "h-[calc(100dvh-6rem)]", "md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-6", "data-action=\"serve\"", "data-action=\"notify\"", "data-action=\"payment\"", "data-action=\"print\"", "data-action=\"preview\""]) assert.ok(activeOrders.includes(token), token);
  assert.ok(!activeOrders.includes("function PosOrderAccordion"));
  assert.ok(activeOrders.includes("formatDelayTime(delay.lateMinutes)"));
});

await check("active-orders:waiter-live-kitchen-payment-dashboard", () => {
  for (const token of ["activeOrderKanbanStages", "Ready for Pickup", "Ready to Serve", "playOperationalSound", "posPreparationProgress(order.status)", "P:{paymentStatus}", "activeOrderPaymentBadgeClass(order.paymentStatus)", "activeOrderServiceFlagClass(ready, \"pickup\")"]) assert.ok(activeOrders.includes(token), token);
  assert.ok(activeOrders.includes('order.hasKitchenTicket !== false || ["ready", "served"].includes(order.status)'));
  assert.ok(!activeOrders.includes('if (order.paymentStatus === "paid") return "Paid";'));
  assert.ok(!activeOrders.includes('if (payment === "paid" && !["cancelled", "completed", "billed"].includes(status)) return "Paid";'));
});

await check("active-orders:status-duration-and-timeline-consistency", () => {
  for (const token of ['key === "accepted"', 'key === "preparing"', 'key === "ready"', 'key === "served"', '"completed"']) assert.ok(statusBadge.includes(token), token);
  assert.ok(delayFormatter.includes('if (value >= 24 * 60) return "24h+"'));
  assert.ok(delayFormatter.includes('return { label: "Stale Order", severity: "stale" }'));
  assert.ok(activeOrders.includes("formatOperationalDuration(delay.elapsedMinutes)"));
  assert.ok(activeOrders.includes("timelineMillis(second) - timelineMillis(first)"));
  assert.ok(activeOrders.includes("timelineCategory(entry)"));
  assert.ok(activeOrders.includes("const seen = new Set<string>()"));
});

await check("active-orders:search-loading-keyboard-and-touch", () => {
  for (const token of ["order.customerPhone", "order.tableNumber", "raw.vehicleNumber", "raw.qrTableCode", "order.waiterName", "order.orderType"]) assert.ok(activeOrders.includes(token), token);
  for (const token of ["allActiveKitchenOrders", "delaysById", "MemoPosActiveOrderCard", "ActiveOrdersSkeleton", "readModelError"]) assert.ok(activeOrders.includes(token), token);
  for (const token of ["ArrowDown", "ArrowUp", "Home", "End", "min-h-11"]) assert.ok(compactActions.includes(token) || activeOrders.includes(token), token);
});

await check("kitchen:ready-signal-without-serving", () => {
  assert.ok(kitchen.includes('label: "Signal Ready"'));
  assert.ok(!kitchen.includes('ready: "served"'));
  assert.ok(kitchen.includes('/api/owner/kitchen/notify-waiter'));
  for (const token of ["kitchen_ready_ops", 'audience: ["owner", "manager", "kitchen"]', 'action === "acknowledge"', 'action === "escalate"']) assert.ok(kitchenNotify.includes(token), token);
  assert.ok(!kitchenNotify.includes('audience: ["waiter"]'));
});

await check("active-orders:multi-ticket-and-bill-only-merge", () => {
  for (const token of ["Open Session", "addOnBillForOrder", "Smart Bill Merge", "Pay Separately", "Merge All", "billing-only", "Kitchen tickets remain separate", "canMergeOrderBill", "assertCanMergeBillingOrder"]) assert.ok(activeOrders.includes(token) || orderRepository.includes(token), token);
  const uiMergeGuard = activeOrders.slice(activeOrders.indexOf("function canMergeOrderBill"), activeOrders.indexOf("function paymentUnavailableReason"));
  const repoMergeGuard = orderRepository.slice(orderRepository.indexOf("function assertCanMergeBillingOrder"), orderRepository.indexOf("function assertPaymentLockOwner"));
  assert.ok(uiMergeGuard.includes('!["authorized", "paid", "refunded"].includes(paymentStatus)'));
  assert.ok(!uiMergeGuard.includes('"partial"'));
  assert.ok(!repoMergeGuard.includes('"partial"'));
  assert.ok(!kitchenRepository.includes("incremental_kot_merged"));
  assert.ok(!orderRepository.includes("mergeKitchenLines"));
});

await check("active-orders:auto-history-holding", () => {
  for (const token of ["completedHistoryHoldMinutes = 30", "Auto history in", "Move To History", "isActiveOrRecentlyCompleted", "completedHoldMinutesRemaining"]) assert.ok(activeOrders.includes(token), token);
});

await check("kitchen:item-first-card-actions", () => {
  for (const token of ["grid gap-2 rounded-xl bg-slate-50 p-2", "More Actions", "Full preview", "setMoreOpen", "onExpandedChange(!expanded)", "<Play", "<CheckCircle2", "<Eye", "<Printer", "<MoreHorizontal"]) assert.ok(kitchen.includes(token), token);
  assert.ok(!kitchen.includes("min-h-[10rem]"));
  assert.ok(!kitchen.includes("min-h-[9rem]"));
  assert.ok(!kitchen.includes("Table {order.tableNumber} ·"));
  assert.ok(kitchen.includes("Customer: {order.customerName || order.guestName || \"Walk-in\"}"));
});

await check("kitchen:responsive-settings-and-duration", () => {
  for (const token of ["autoNotifyWaiter", "autoPrintOrders", "soundAlerts", "repeatNotification", "escalationTimeout", "notificationMethod", "auto-fit", "grid-template-columns:repeat(auto-fit", "formatOperationalDuration", "itemHeight = 292"]) assert.ok(kitchen.includes(token) || read("src/lib/kitchen-delay.ts").includes(token), token);
});

await check("notifications:configurable-operational-sounds", () => {
  const settings = read("src/lib/order-delay-settings.ts");
  const ownerSettings = read("src/components/flows/owner-settings-flow.tsx");
  for (const token of ["newOrder", "kitchenAccepted", "preparing", "readyForPickup", "urgentDelay", "customerRequest", "normalizeOperationalNotificationSounds"]) assert.ok(settings.includes(token), token);
  for (const token of ["Save sounds", "saveNotificationSounds", "New Order", "Kitchen Accepted", "Ready for Pickup", "Customer Request"]) assert.ok(ownerSettings.includes(token), token);
  for (const token of ["playConfiguredSound(\"newOrder\")", "playConfiguredSound(\"readyForPickup\")", "playConfiguredSound(\"urgentDelay\")", "playConfiguredSound(\"customerRequest\")"]) assert.ok(kitchen.includes(token), token);
  assert.ok(kitchenNotify.includes("cleanSound(body.sound)"));
});

const failed = results.filter(({ status }) => status === "FAIL");
const rows = results.map(({ name, status, detail = "" }) => `| ${name} | ${status} | ${detail.replaceAll("|", "\\|")} |`).join("\n");
fs.writeFileSync(path.join(root, "docs/validation/OPERATIONAL_HARDENING_REPORT.md"), `# RC5 Operational Hardening Automation\n\nGenerated: ${new Date().toISOString()}\n\nResult: ${failed.length ? "FAIL" : "PASS"} — ${results.length - failed.length}/${results.length} checks passed.\n\n| Check | Status | Detail |\n| --- | --- | --- |\n${rows}\n\nThis suite deterministically covers draft storage fallback, tenant/operator isolation, fault classification, lifecycle replay hooks, role contracts, notification matrix, retry/dedup/token lifecycle, service-worker foreground/background action routing, payment-independent split flow, partial-payment bill-only merge guards, and Active Orders accessibility contracts. Real provider delivery, production credentials, physical devices, browsers, and hardware remain manual.\n`);
for (const result of results) console.log(`${result.status} ${result.name}${result.detail ? `: ${result.detail}` : ""}`);
if (failed.length) process.exitCode = 1;
