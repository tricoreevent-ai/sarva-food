export type PluginAPIScope =
  | "notifications"
  | "toast"
  | "modal"
  | "clipboard"
  | "theme"
  | "navigation"
  | "localization"
  | "formatting"
  | "date"
  | "currency"
  | "analytics";

export type PluginAPIRequest<TPayload = unknown> = {
  pluginId: string;
  scope: PluginAPIScope;
  action: string;
  payload?: TPayload;
};

export type PluginAPIResponse<TValue = unknown> = {
  ok: boolean;
  value?: TValue;
  error?: string;
};

export type PluginAPIHandler = (request: PluginAPIRequest) => PluginAPIResponse | Promise<PluginAPIResponse>;

class PluginAPIRegistry {
  private handlers = new Map<PluginAPIScope, PluginAPIHandler>();

  register(scope: PluginAPIScope, handler: PluginAPIHandler) {
    this.handlers.set(scope, handler);
    return () => this.handlers.delete(scope);
  }

  async call<TValue = unknown>(request: PluginAPIRequest): Promise<PluginAPIResponse<TValue>> {
    const handler = this.handlers.get(request.scope);
    if (!handler) return { ok: false, error: `Plugin API scope is not registered: ${request.scope}.` };
    return handler(request) as Promise<PluginAPIResponse<TValue>>;
  }

  listScopes() {
    return Array.from(this.handlers.keys());
  }
}

const pluginAPIRegistry = new PluginAPIRegistry();

export function getPluginAPIRegistry() {
  return pluginAPIRegistry;
}
