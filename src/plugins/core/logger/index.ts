export type PluginLogLevel = "debug" | "info" | "warning" | "error" | "performance";

export type PluginLogger = {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warning: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  performance: (message: string, data?: Record<string, unknown>) => void;
  group: (label: string, callback: () => void) => void;
};

export function createPluginLogger(pluginId: string): PluginLogger {
  const prefix = `[plugin:${pluginId}]`;

  return {
    debug: (message, data) => write("debug", prefix, message, data),
    info: (message, data) => write("info", prefix, message, data),
    warning: (message, data) => write("warning", prefix, message, data),
    error: (message, data) => write("error", prefix, message, data),
    performance: (message, data) => write("performance", prefix, message, data),
    group: (label, callback) => group(prefix, label, callback),
  };
}

function write(
  level: PluginLogLevel,
  prefix: string,
  message: string,
  data?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") return;
  const args = data ? [prefix, message, data] : [prefix, message];
  if (level === "error") {
    console.error(...args);
    return;
  }
  if (level === "warning") {
    console.warn(...args);
    return;
  }
  console.info(...args);
}

function group(prefix: string, label: string, callback: () => void) {
  if (process.env.NODE_ENV === "production") return;
  console.groupCollapsed(`${prefix} ${label}`);
  try {
    callback();
  } finally {
    console.groupEnd();
  }
}
