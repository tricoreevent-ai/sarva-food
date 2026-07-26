export {
  buildOperationalOrders as mergeLiveOperationalOrders,
  isActiveDemoOrder,
  isOperationalTerminalStatus as isLiveTerminalStatus,
  serviceStatusForKitchenOrder,
  tableStatusForOrder,
  type OperationalOrder as LiveOperationalOrder,
} from "@/lib/active-orders-model";
