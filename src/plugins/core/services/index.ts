export type PluginServiceResult<T = void> = {
  ok: boolean;
  value?: T;
  reason?: string;
};

export type PluginServices = {
  notifications: {
    notify: (message: string, data?: Record<string, unknown>) => PluginServiceResult;
  };
  toast: {
    show: (message: string, tone?: "info" | "success" | "warning" | "error") => PluginServiceResult;
  };
  modal: {
    open: (id: string, data?: Record<string, unknown>) => PluginServiceResult;
    close: (id: string) => PluginServiceResult;
  };
  clipboard: {
    copy: (value: string) => Promise<PluginServiceResult>;
  };
  theme: {
    read: () => "system";
  };
  navigation: {
    go: (href: string) => PluginServiceResult;
  };
  localization: {
    translate: (key: string, fallback?: string) => string;
  };
  formatting: {
    number: (value: number, locale?: string) => string;
  };
  date: {
    format: (value: Date | number | string, locale?: string) => string;
  };
  currency: {
    format: (value: number, currency?: string, locale?: string) => string;
  };
  analytics: {
    track: (event: string, data?: Record<string, unknown>) => PluginServiceResult;
  };
};

export function createPluginServices(pluginId: string): PluginServices {
  const ok = <T = void>(value?: T): PluginServiceResult<T> => ({ ok: true, value });
  void pluginId;

  return {
    notifications: { notify: () => ok() },
    toast: { show: () => ok() },
    modal: {
      open: () => ok(),
      close: () => ok(),
    },
    clipboard: {
      copy: async (value) => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(value);
          return ok();
        }
        return { ok: false, reason: "Clipboard is unavailable." };
      },
    },
    theme: { read: () => "system" },
    navigation: { go: () => ok() },
    localization: { translate: (_key, fallback) => fallback ?? _key },
    formatting: { number: (value, locale) => new Intl.NumberFormat(locale).format(value) },
    date: { format: (value, locale) => new Intl.DateTimeFormat(locale).format(new Date(value)) },
    currency: {
      format: (value, currency = "INR", locale) =>
        new Intl.NumberFormat(locale, { style: "currency", currency }).format(value),
    },
    analytics: { track: () => ok() },
  };
}
