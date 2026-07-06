import { readFileSync } from "node:fs";

const checks = [
  ["state machine", "src/lib/order-state-machine.ts", ["assertLegalOrderTransition", "assertLegalKitchenTransition", "assertCanStartPayment"]],
  ["order idempotency", "src/repositories/order-repository.ts", ["operationKeys", "hasOperationKey", "runTransaction"]],
  ["kitchen idempotency", "src/repositories/kitchen-repository.ts", ["operationKeys", "mergeIncrementalIntoParent", "runTransaction"]],
  ["owner order logging", "src/app/api/owner/orders/route.ts", ["operationKey", "logOperationalEvent", "logOperationalFailure"]],
  ["kitchen logging", "src/app/api/owner/kitchen/route.ts", ["operationKey", "logOperationalEvent", "logOperationalFailure"]],
  ["pos recovery", "src/components/flows/pos-billing-flow.tsx", ["PosSyncBanner", "paymentDraftKey", "clientOperationKey"]],
];

const failures = checks.flatMap(([name, file, needles]) => {
  const text = readFileSync(file, "utf8");
  return needles.filter((needle) => !text.includes(needle)).map((needle) => `${name}: missing ${needle}`);
});

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Operational hardening smoke passed.");
}
