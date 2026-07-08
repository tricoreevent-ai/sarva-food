import { QUALITY_DIAGNOSTICS_FEATURE_ID } from "../feature-flag";
import type {
  QualityDiagnosticsOptions,
  QualityDiagnosticsRating,
  QualityDiagnosticsSnapshot,
} from "../types";

type MemoryPerformance = Performance & {
  memory?: {
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
};

type IdleWindow = Window & {
  requestIdleCallback?: (handler: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function startQualityDiagnostics({
  route,
  config,
  onSnapshot,
}: QualityDiagnosticsOptions) {
  let active = true;
  let longTaskCount = 0;
  let worstLongTaskMs = 0;
  const startedAtMs = performance.now();

  const snapshot = (): QualityDiagnosticsSnapshot => {
    const memory = readMemory();
    return {
      featureId: QUALITY_DIAGNOSTICS_FEATURE_ID,
      route,
      startedAtMs,
      generatedAtMs: performance.now(),
      longTaskCount,
      worstLongTaskMs: Math.round(worstLongTaskMs),
      ...memory,
      rating: rateSnapshot(config, worstLongTaskMs, memory?.usedHeapMb, memory?.heapLimitMb),
    };
  };

  const emit = () => {
    if (!active) return;
    const next = snapshot();
    onSnapshot(next);
    window.dispatchEvent(new CustomEvent("sarva:quality-diagnostics", { detail: next }));
  };

  const cancelIdle = scheduleIdle(emit, 1600);
  const interval = window.setInterval(emit, config.sampleMs);
  const observer = observeLongTasks((duration) => {
    longTaskCount += 1;
    worstLongTaskMs = Math.max(worstLongTaskMs, duration);
  });

  return () => {
    active = false;
    cancelIdle();
    window.clearInterval(interval);
    observer?.disconnect();
  };
}

function observeLongTasks(onTask: (duration: number) => void) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) onTask(entry.duration);
    });
    observer.observe({ type: "longtask", buffered: true });
    return observer;
  } catch {
    return undefined;
  }
}

function readMemory() {
  const memory = (performance as MemoryPerformance).memory;
  if (!memory) return undefined;
  return {
    usedHeapMb: Math.round(memory.usedJSHeapSize / 1024 / 1024),
    heapLimitMb: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
  };
}

function rateSnapshot(
  config: QualityDiagnosticsOptions["config"],
  worstLongTaskMs: number,
  usedHeapMb?: number,
  heapLimitMb?: number,
): QualityDiagnosticsRating {
  if (worstLongTaskMs > config.longTaskCriticalMs) return "critical";
  if (usedHeapMb && heapLimitMb && usedHeapMb > heapLimitMb * config.memoryCriticalRatio) return "critical";
  if (worstLongTaskMs > config.longTaskWarningMs) return "watch";
  if (usedHeapMb && heapLimitMb && usedHeapMb > heapLimitMb * config.memoryWarningRatio) return "watch";
  return "ok";
}

function scheduleIdle(callback: () => void, timeoutMs: number) {
  const win = window as IdleWindow;
  if (typeof win.requestIdleCallback === "function") {
    const id = win.requestIdleCallback(callback, { timeout: timeoutMs });
    return () => win.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, timeoutMs);
  return () => window.clearTimeout(id);
}
