export type EnterprisePluginState =
  | "UNREGISTERED"
  | "REGISTERED"
  | "VALIDATED"
  | "INITIALIZED"
  | "ENABLED"
  | "RUNNING"
  | "SUSPENDED"
  | "RESUMED"
  | "DISABLED"
  | "DESTROYED";

export class PluginRegistryError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "PluginRegistryError";
  }
}

const transitions: Record<EnterprisePluginState, EnterprisePluginState[]> = {
  UNREGISTERED: ["REGISTERED"],
  REGISTERED: ["VALIDATED", "DESTROYED"],
  VALIDATED: ["INITIALIZED", "DISABLED", "DESTROYED"],
  INITIALIZED: ["ENABLED", "DISABLED", "DESTROYED"],
  ENABLED: ["RUNNING", "SUSPENDED", "DISABLED", "DESTROYED"],
  RUNNING: ["SUSPENDED", "DISABLED", "DESTROYED"],
  SUSPENDED: ["RESUMED", "DISABLED", "DESTROYED"],
  RESUMED: ["RUNNING", "SUSPENDED", "DISABLED", "DESTROYED"],
  DISABLED: ["INITIALIZED", "DESTROYED"],
  DESTROYED: [],
};

export function assertPluginTransition(from: EnterprisePluginState, to: EnterprisePluginState) {
  if (!transitions[from].includes(to)) {
    throw new PluginRegistryError(`Invalid plugin state transition: ${from} -> ${to}.`, "INVALID_PLUGIN_STATE_TRANSITION");
  }
}
