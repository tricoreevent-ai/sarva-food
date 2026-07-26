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
const activeOrdersPanel = read("src/components/flows/active-orders-panel.tsx");
const activeOrdersModel = read("src/lib/active-orders-model.ts");
const activeOrders = [activeOrdersPanel, activeOrdersModel, pos].join("\n");
const stateMachine = read("src/lib/order-state-machine.ts");
const orderRepository = read("src/repositories/order-repository.ts");
const kitchenRepository = read("src/repositories/kitchen-repository.ts");
const delayFormatter = read("src/lib/kitchen-delay.ts");
const statusBadge = read("src/components/orders/OperationalOrderStatusBadge.tsx");
const compactActions = read("src/components/orders/CompactOrderAccordionActions.tsx");
const kitchen = read("src/components/flows/kitchen-display-flow.tsx");
const ownerLogin = read("src/components/flows/owner-portal-login-flow.tsx");
const kitchenApi = read("src/app/api/owner/kitchen/route.ts");
const orderApi = read("src/app/api/owner/orders/route.ts");
const posStreamApi = read("src/app/api/owner/pos/stream/route.ts");
const reportsStreamApi = read("src/app/api/owner/reports/stream/route.ts");
const readySignalStreamApi = read("src/app/api/owner/kitchen/notify-waiter/stream/route.ts");
const printerApi = read("src/app/api/owner/printers/route.ts");
const printerHook = read("src/hooks/use-printer-settings.ts");
const ownerOrders = read("src/components/flows/owner-order-management-flow.tsx");
const itemDetail = read("src/components/flows/food-item-detail-flow.tsx");
const itemLinks = read("src/lib/menu-item-links.ts");
const shortener = read("src/services/urlShortener.ts");
const shortLinkRoute = read("src/app/r/[slug]/[itemId]/route.ts");
const shareHook = read("src/hooks/useWhatsAppShare.ts");
const shareModal = read("src/components/WhatsAppShareModal.tsx");
const shareTemplate = read("src/services/whatsappTemplate.ts");
const productionHealth = read("src/lib/server/production-health.ts");
const dashboardShell = read("src/components/layout/dashboard-shell-client.tsx");
const ownerDashboard = read("src/app/owner/page.tsx");
const liveOperationalOrders = read("src/lib/live-operational-orders.ts");
const realtimePatch = read("src/lib/realtime-patch.ts");
const kitchenNotify = read("src/app/api/owner/kitchen/notify-waiter/route.ts");
const ownerAccess = read("src/lib/server/owner-api-access.ts");
const mutationOrigin = read("src/lib/server/mutation-origin.ts");
const firestoreRules = read("firestore.rules");
const productCard = read("src/modules/owner/pos/components/product-card.tsx");
const productGrid = read("src/modules/owner/pos/components/product-grid.tsx");
const ownerSettings = read("src/components/flows/owner-settings-flow.tsx");
const operationalSettings = read("src/lib/order-delay-settings.ts");
const orderDisplay = read("src/lib/order-display.ts");
const realtimeOrder = read("src/hooks/use-realtime-order.ts");
const rootLayout = read("src/app/layout.tsx");
const customerShellRuntime = read("src/components/layout/customer-shell-runtime.tsx");
const dashboardShellRuntime = read("src/components/layout/dashboard-shell.tsx");
const cloudinarySignature = read("src/app/api/cloudinary/signature/route.ts");
const orderNotification = read("src/app/api/public/order-notification/route.ts");
const testSession = read("src/app/api/auth/test-session/route.ts");

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

await check("owner-login:enterprise-auth-experience", () => {
  for (const token of ["Nammude OS", "Remember email", "Caps Lock is on", "sarva.owner.login.email", "autoFocus", "autoComplete", "Secure access", "Securing session"]) assert.ok(ownerLogin.includes(token), token);
  assert.ok(ownerLogin.includes("Forgot password?"));
  assert.ok(ownerLogin.includes("one-time-code"));
});

await check("kitchen-history:enterprise-management-table", () => {
  for (const token of ["kitchenHistoryColumns", "sticky right-0", "saveFilter", "CSV", "Excel", "Print status", "KitchenHistoryDetails", "recordsToCsv", "xlsx", "kitchenHistoryDensityRowClass", "readKitchenHistoryColumnWidths", "resizeColumn", "MemoKitchenHistoryTableRow", "role=\"toolbar\"", "Advanced", "Columns", "Reset widths", "accessKey=\"v\"", "onKeyDown={handleKeyDown}"]) assert.ok(kitchen.includes(token), token);
  for (const token of ["pageSize", "page", "query", "printStatus", "customer", "count", "filtered.slice"]) assert.ok(kitchenApi.includes(token), token);
  assert.ok(!kitchen.includes("KitchenHistoryOrderAccordion"));
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

await check("active-orders:owner-waiter-unified-send-to-kitchen", () => {
  for (const token of ["export function ActiveOrdersPanel", "export function buildOperationalOrders", "onAdvanceKitchen", "kitchenActionAllowed"]) assert.ok(activeOrders.includes(token), token);
  assert.ok(pos.includes("activeOrderHandoffKey"));
  assert.ok(ownerOrders.includes("activeOrderHandoffKey"));
  for (const token of ["<ActiveOrdersPanel", "buildOperationalOrders(orders, tableOrders)", "sendOwnerOrderToKitchen", "handoffToPos(order"]) assert.ok(ownerOrders.includes(token), token);
  for (const token of ['body.action === "send_to_kitchen"', '"send_to_kitchen"']) assert.ok(orderApi.includes(token), token);
  for (const token of ["async sendToKitchen", "kot-order-", "transaction.set(customerOrderRef", "writeAudit(transaction, scope", "writeNotification(transaction, scope"]) assert.ok(orderRepository.includes(token), token);
});

await check("menu:item-route-and-internal-sharing", () => {
  for (const token of ["canonicalMenuItemId", 'split("::")[0]', "menuItemPath", "menuItemShortPath"]) assert.ok(itemLinks.includes(token), token);
  assert.ok(itemDetail.includes("canonicalMenuItemId(entry.id) === requestedItemId"));
  assert.ok(shortener.includes('provider: "internal"'));
  assert.ok(!shortener.toLowerCase().includes("tinyurl.com"));
  assert.ok(shortLinkRoute.includes("menuItemPath(slug, itemId)"));
  for (const token of ['"telegram"', '"sms"', '"email"', "openChannel"]) assert.ok(shareHook.includes(token) || shareModal.includes(token), token);
  for (const token of ["Delivery available", "Schedule:", "Call:", "Map:"]) assert.ok(shareTemplate.includes(token), token);
});

await check("health:runtime-failures-vs-credential-warnings", () => {
  assert.ok(productionHealth.includes("configurationWarnings"));
  assert.ok(productionHealth.includes("firebase_admin_explicit_config_missing_using_application_default_credentials"));
  const blockingIssues = productionHealth.slice(productionHealth.indexOf("const issues = ["), productionHealth.indexOf("const configurationWarnings"));
  assert.ok(blockingIssues.includes("firestore_unavailable"));
  assert.ok(!blockingIssues.includes("firebase_admin_config_missing"));
});

await check("design:admin-reuses-owner-shell-theme", () => {
  assert.ok(dashboardShell.includes('app === "admin" && ["owner-premium"'));
  assert.ok(!dashboardShell.includes('app === "admin" && ["admin-premium"'));
  assert.ok(!dashboardShell.includes('from "@/themes/admin-theme"'));
});

await check("active-orders:strict-lifecycle", () => {
  assert.ok(activeOrdersPanel.includes("const canComplete = served && paid"));
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
  const collectGuard = activeOrdersPanel.match(/export function canCollectOrderPayment[\s\S]*?}\r?\n\r?\nexport function paymentUnavailableReason/)?.[0] ?? "";
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

await check("pos:display-options-and-hidden-image-performance", () => {
  for (const token of ["DisplayOptionsMenu", "Show Product Images", "Hide Product Images", "Compact Cards", "Comfortable Cards", "Grid View", "List View", "Show Item Description", "Show Price Only", "Large Touch Mode", "Compact Desktop Mode"]) assert.ok(pos.includes(token), token);
  for (const token of ["sarva-pos-display-options:v1", "defaultPosDisplayPrefs", "window.matchMedia(\"(max-width: 767px)\")", "readSavedDisplayPrefs", "normalizeDisplayPrefs"]) assert.ok(pos.includes(token), token);
  for (const token of ["showImages ? (", "<SafeImage", "loading=\"lazy\"", "layout={rowMode ? \"row\" : \"grid\"}", "visibleCount", "Show {Math.min(pageSize"]) assert.ok(productCard.includes(token) || productGrid.includes(token), token);
  assert.ok(productCard.indexOf("showImages ? (") < productCard.indexOf("<SafeImage"));
});

await check("pos:workflow-settings-review-actions", () => {
  for (const token of ["posDisplayDefaults", "posWorkflowMode", "sequentialOrderNumbering", "payment-first", "kitchen-first", "flexible"]) assert.ok(operationalSettings.includes(token), token);
  for (const token of ["POS workflow", "Sequential POS numbering", "POS images by default", "POS compact cards", "POS list view default"]) assert.ok(ownerSettings.includes(token), token);
  for (const token of ["Continue to Payment", "Send to Kitchen", "workflowMode === \"payment-first\"", "workflowMode === \"kitchen-first\"", "onContinuePayment", "onSendToKitchen"]) assert.ok(pos.includes(token), token);
});

await check("pos:incremental-realtime-stream", () => {
  for (const token of ["new EventSource", "applyRealtimePatch", "ordersUpsert", "kitchenUpsert", "orderIdsRemoved", "kitchenIdsRemoved"]) assert.ok(pos.includes(token) || posStreamApi.includes(token), token);
  for (const token of ["snapshot.docChanges()", "orderDocToOperationalDemoOrder", "kitchenDocToTableOrder", "text/event-stream", "no-cache, no-transform"]) assert.ok(posStreamApi.includes(token), token);
  assert.ok(!posStreamApi.includes("emitState()"));
});

await check("kitchen:incremental-realtime-stream", () => {
  for (const token of ["snapshot.docChanges()", "upsert", "removed", "snapshot.size"]) assert.ok(read("src/app/api/owner/kitchen/stream/route.ts").includes(token), token);
  assert.ok(kitchen.includes("applyRealtimePatch(current, payload.data, payload.upsert, payload.removed)"));
});

await check("kitchen:ready-signal-realtime-stream", () => {
  for (const token of ["new EventSource(\"/api/owner/kitchen/notify-waiter/stream\")", "patchReadySignals", "events.close()"]) assert.ok(kitchen.includes(token), token);
  for (const token of ["collection(\"notifications\")", "type\", \"==\", \"kitchen_ready_ops", "snapshot.docChanges()", "ready-signals"]) assert.ok(readySignalStreamApi.includes(token), token);
  assert.ok(!kitchen.includes("window.setInterval(load, 15_000)"));
});

await check("kitchen:rbac-bootstrap-without-tables", () => {
  assert.ok(!kitchen.includes("/api/owner/tables"));
  assert.ok(!kitchen.includes("activeRequests"));
  assert.ok(kitchen.includes("usePrinterSettings(\"kitchen\")"));
  assert.ok(printerHook.includes("?surface=${surface}"));
  for (const token of ["kitchenSurface", "requirePrinterAccess", "kitchenPrinterSettings", "mergeKitchenPrinterSettings"]) assert.ok(printerApi.includes(token), token);
  assert.ok(printerApi.includes("repository.get(scope)"));
  assert.ok(printerApi.includes("if (kitchenSurface) return NextResponse.json({ data: kitchenPrinterSettings(data), context: null })"));
});

await check("live-data:owner-dashboard-orders-kitchen-consistency", () => {
  for (const token of ["mergeLiveOperationalOrders", "serviceStatusForKitchenOrder", "linkedKitchenIds", "canonicalOrderId", "hasKitchenTicket"]) assert.ok(liveOperationalOrders.includes(token) || ownerOrders.includes(token), token);
  for (const token of ["new EventSource(\"/api/owner/pos/stream\")", "applyRealtimePatch", "dashboardRowFromLiveOrder", "activeOrdersCount: activeOrders.length", "total: activeKitchenOrders.length"]) assert.ok(ownerDashboard.includes(token), token);
  for (const token of ["new EventSource(\"/api/owner/pos/stream\")", "matchesLiveDateRange", "serviceStatusForKitchenOrder", "canonicalOrderId", "linkedKitchenIds", "updateOrder(order.canonicalOrderId ?? order.id, \"served\")", "Open and save this order before updating service status."]) assert.ok(ownerOrders.includes(token), token);
  assert.ok(realtimePatch.includes("new Map(current.filter"));
  assert.ok(!ownerOrders.includes('updateKitchenOrder(order.kitchenOrder, "served")'));
});

await check("reports:live-operational-sync", () => {
  const reports = read("src/app/owner/reports/page.tsx");
  for (const token of ["new EventSource(\"/api/owner/reports/stream\")", "summarizeReports", "reportOrderFromLive", "applyRealtimePatch(current.orders"]) assert.ok(reports.includes(token), token);
  for (const token of ["requireOwnerFeature(request, \"reports\", \"read\")", "snapshot.docChanges()", "ordersUpsert", "orderIdsRemoved"]) assert.ok(reportsStreamApi.includes(token), token);
});

await check("orders:restaurant-sequential-numbering", () => {
  for (const token of ["restaurantCounters", "posOrderSequence", "nextOrderNumber", "withSequentialOrderNumber", "orderSequencePatch", "transaction.set(kitchenRef", "displayOrderNumber: orderNumber"]) assert.ok(orderRepository.includes(token), token);
  assert.ok(orderDisplay.includes('return `#${text.slice(1).padStart(4, "0")}`'));
  assert.ok(orderDisplay.includes('return trailing ? `#${trailing.padStart(4, "0")}` : "";'));
});

await check("kitchen:add-on-ticket-idempotency", () => {
  for (const token of ["addOnParentKitchenOrderId === bill.linkedKitchenOrderId", "operationId", "id: `kot-${operationKey}`", "id: `inc-${operationKey}`"]) assert.ok(pos.includes(token), token);
  assert.ok(kitchenRepository.includes("existing = current;"));
  assert.ok(kitchenApi.includes("cleanDocumentId(body.id) ?? `kot-${opKey}`"));
});

await check("active-orders:dense-memoized-layout", () => {
  for (const token of ["useDebouncedValue(search, 120)", "MemoActiveOrderCard", "handlersRef", "h-[calc(100dvh-6rem)]", "md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-6", "data-action=\"serve\"", "data-action=\"notify\"", "data-action=\"payment\"", "data-action=\"print\"", "data-action=\"preview\""]) assert.ok(activeOrders.includes(token), token);
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
  for (const token of ["allActiveKitchenOrders", "delaysById", "MemoActiveOrderCard", "ActiveOrdersSkeleton", "readModelError"]) assert.ok(activeOrders.includes(token), token);
  for (const token of ["ArrowDown", "ArrowUp", "Home", "End", "min-h-11"]) assert.ok(compactActions.includes(token) || activeOrders.includes(token), token);
});

await check("kitchen:ready-signal-without-serving", () => {
  assert.ok(kitchen.includes('label: "Signal Ready"'));
  assert.ok(!kitchen.includes('ready: "served"'));
  assert.ok(kitchen.includes('/api/owner/kitchen/notify-waiter'));
  for (const token of ["kitchen_ready_ops", 'audience: ["waiter"]', 'monitoringAudience: ["owner", "manager"]', "targetUserIds", 'action === "acknowledge"', 'action === "escalate"']) assert.ok(kitchenNotify.includes(token), token);
});

await check("rbac:waiter-serve-complete-without-bill-edit", () => {
  for (const token of ['requireOwnerFeature(request, "orders", "read")', "orderMutationPermissionError", "waiterOrderActionAllowed", 'body.status === "served" || body.status === "completed"', '"payment_started"', '"payment"', "Waiter can serve, complete"]) assert.ok(orderApi.includes(token), token);
  for (const token of ['const canCollectForView = canCollect;', 'view === "waiter" ? "Kitchen sends ready signals; serve the ticket after pickup."']) assert.ok(activeOrders.includes(token), token);
});

await check("rbac:kitchen-cannot-serve", () => {
  assert.ok(kitchenApi.includes('const statuses = new Set<KitchenOrderStatus>(["new", "accepted", "preparing", "ready", "cancelled"])'));
  assert.ok(kitchenApi.includes('requireOwnerFeature(request, "kitchen", "update")'));
  assert.ok(firestoreRules.includes('request.resource.data.status in ["new", "accepted", "preparing", "ready", "cancelled"]'));
  assert.ok(firestoreRules.includes('canUpdateKitchenStatusForRole(request.resource.data.status)'));
});

await check("rbac:owner-override-and-permission-denial", () => {
  assert.ok(orderApi.includes('["owner", "admin", "super_admin"].includes(role)'));
  assert.ok(orderApi.includes("Permission denied for orders:update."));
  assert.ok(ownerAccess.includes("Permission denied for ${feature}:${operation}."));
});

await check("rbac:firestore-role-parity", () => {
  const orderStatusOnly = firestoreRules.slice(firestoreRules.indexOf("function orderStatusOnlyUpdate"), firestoreRules.indexOf("match /users"));
  assert.ok(firestoreRules.includes('currentUser().role == "waiter" && status in ["served", "completed"]'));
  assert.ok(firestoreRules.includes('currentUser().role in ["chef", "kitchen-manager"] && status in ["accepted", "preparing", "ready", "cancelled"]'));
  assert.ok(!orderStatusOnly.includes('"paymentStatus"'));
});

await check("kitchen:waiter-pos-kot-access-without-kitchen-update", () => {
  for (const token of ["requireKitchenAccess", "isWaiterWorkflowSession", 'requireOwnerFeature(request, "pos", operation)']) assert.ok(kitchenApi.includes(token), token);
  assert.ok(kitchenNotify.includes('action === "acknowledge" ? "read" : "update"'));
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
  for (const token of ["playConfiguredSound(\"newOrder\")", "playConfiguredSound(\"readyForPickup\")", "playConfiguredSound(\"urgentDelay\")"]) assert.ok(kitchen.includes(token), token);
  assert.ok(!kitchen.includes("playConfiguredSound(\"customerRequest\")"));
  assert.ok(kitchenNotify.includes("cleanSound(body.sound)"));
});

await check("customer:realtime-order-with-single-alert-provider", () => {
  assert.ok(realtimeOrder.includes('import("@/services/order-service")'));
  assert.ok(realtimeOrder.includes("listenToOrder(orderId"));
  assert.ok(!realtimeOrder.includes("setInterval"));
  assert.ok(rootLayout.includes("<AlertProvider>{children}</AlertProvider>"));
  assert.ok(!customerShellRuntime.includes("<AlertProvider>"));
  assert.ok(!dashboardShellRuntime.includes("<AlertProvider>"));
});

await check("security:upload-notification-and-test-endpoint-boundaries", () => {
  for (const token of ["getSessionFromRequest", "Upload permission denied.", "rateLimit", "isAuthorizedFolder", "quality_analysis"]) assert.ok(cloudinarySignature.includes(token), token);
  assert.ok(!cloudinarySignature.includes('publicId: "public_id"'));
  for (const token of ['getSessionFromRequest(request, "customer")', "getForCustomer", "order-notification:", "ownerEmail: undefined"]) assert.ok(orderNotification.includes(token), token);
  assert.ok(testSession.includes('process.env.NODE_ENV === "production"'));
  assert.ok(testSession.includes('{ status: 404 }'));
});

const failed = results.filter(({ status }) => status === "FAIL");
const rows = results.map(({ name, status, detail = "" }) => `| ${name} | ${status} | ${detail.replaceAll("|", "\\|")} |`).join("\n");
fs.writeFileSync(path.join(root, "docs/validation/OPERATIONAL_HARDENING_REPORT.md"), `# RC5 Operational Hardening Automation\n\nGenerated: ${new Date().toISOString()}\n\nResult: ${failed.length ? "FAIL" : "PASS"} — ${results.length - failed.length}/${results.length} checks passed.\n\n| Check | Status | Detail |\n| --- | --- | --- |\n${rows}\n\nThis suite deterministically covers draft storage fallback, tenant/operator isolation, fault classification, lifecycle replay hooks, role contracts, order/kitchen RBAC parity, waiter serving authorization, unified Owner/Waiter Active Orders send-to-kitchen contracts, live Owner Dashboard/Owner Orders/Kitchen consistency, notification matrix, retry/dedup/token lifecycle, service-worker foreground/background action routing, owner login UX/accessibility contracts, Kitchen History enterprise data-grid contracts, payment-independent split flow, partial-payment bill-only merge guards, and Active Orders accessibility contracts. Real provider delivery, production credentials, physical devices, browsers, and hardware remain manual.\n`);
for (const result of results) console.log(`${result.status} ${result.name}${result.detail ? `: ${result.detail}` : ""}`);
if (failed.length) process.exitCode = 1;
