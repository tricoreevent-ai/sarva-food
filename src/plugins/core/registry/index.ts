import { getPluginEventBus } from "../events";
import type { PluginMetadata } from "../metadata/types";
import { assertPluginTransition, type EnterprisePluginState, PluginRegistryError } from "./state";

type RegistryRecord = {
  metadata: PluginMetadata;
  state: EnterprisePluginState;
  registeredAt: number;
  updatedAt: number;
};

class EnterprisePluginRegistry {
  private records = new Map<string, RegistryRecord>();
  private flagIndex = new Map<string, string>();
  private nameIndex = new Map<string, string>();
  private bus = getPluginEventBus();

  register(metadata: PluginMetadata) {
    if (this.records.has(metadata.id)) throw new PluginRegistryError(`Duplicate plugin id: ${metadata.id}.`, "DUPLICATE_PLUGIN_ID");
    if (this.flagIndex.has(metadata.featureFlag)) throw new PluginRegistryError(`Duplicate feature flag: ${metadata.featureFlag}.`, "DUPLICATE_FEATURE_FLAG");
    if (this.nameIndex.has(metadata.name)) throw new PluginRegistryError(`Duplicate plugin name: ${metadata.name}.`, "DUPLICATE_PLUGIN_NAME");
    const now = Date.now();
    const record: RegistryRecord = { metadata, state: "REGISTERED", registeredAt: now, updatedAt: now };
    this.records.set(metadata.id, record);
    this.flagIndex.set(metadata.featureFlag, metadata.id);
    this.nameIndex.set(metadata.name, metadata.id);
    this.publish("PluginRegistered", metadata.id, "REGISTERED");
    return record;
  }

  unregister(id: string) {
    const record = this.requireRecord(id);
    if (record.state !== "DESTROYED") assertPluginTransition(record.state, "DESTROYED");
    this.records.delete(id);
    this.flagIndex.delete(record.metadata.featureFlag);
    this.nameIndex.delete(record.metadata.name);
    this.publish("PluginRemoved", id, "DESTROYED");
  }

  markValidated(id: string) {
    return this.transition(id, "VALIDATED", "PluginValidated");
  }

  markInitialized(id: string) {
    return this.transition(id, "INITIALIZED", "PluginLoaded");
  }

  enable(id: string) {
    return this.transition(id, "ENABLED", "PluginEnabled");
  }

  run(id: string) {
    return this.transition(id, "RUNNING", "PluginEnabled");
  }

  disable(id: string) {
    return this.transition(id, "DISABLED", "PluginDisabled");
  }

  suspend(id: string) {
    return this.transition(id, "SUSPENDED", "PluginDisabled");
  }

  resume(id: string) {
    return this.transition(id, "RESUMED", "PluginEnabled");
  }

  destroy(id: string) {
    return this.transition(id, "DESTROYED", "PluginRemoved");
  }

  get(id: string) {
    return this.records.get(id);
  }

  getState(id: string) {
    return this.requireRecord(id).state;
  }

  getMetadata(id: string) {
    return this.requireRecord(id).metadata;
  }

  lookupByFlag(flag: string) {
    const id = this.flagIndex.get(flag);
    return id ? this.records.get(id) : undefined;
  }

  list() {
    return Array.from(this.records.values());
  }

  clear() {
    this.records.clear();
    this.flagIndex.clear();
    this.nameIndex.clear();
  }

  private transition(id: string, state: EnterprisePluginState, event: string) {
    const record = this.requireRecord(id);
    assertPluginTransition(record.state, state);
    record.state = state;
    record.updatedAt = Date.now();
    this.publish(event, id, state);
    return record;
  }

  private requireRecord(id: string) {
    const record = this.records.get(id);
    if (!record) throw new PluginRegistryError(`Plugin is not registered: ${id}.`, "PLUGIN_NOT_REGISTERED");
    return record;
  }

  private publish(event: string, pluginId: string, state: EnterprisePluginState) {
    this.bus.publish("plugin:lifecycle", { pluginId, state: event, previousState: state });
  }
}

const enterprisePluginRegistry = new EnterprisePluginRegistry();

export function getEnterprisePluginRegistry() {
  return enterprisePluginRegistry;
}
