export type PluginProfilerReport = {
  started: boolean;
  generatedAt: number;
  renderCounts: Record<string, number>;
  slowComponents: Array<{ id: string; durationMs: number }>;
  longTasks: Array<{ durationMs: number; atMs: number }>;
  fps: number;
  memory?: { usedHeapMb: number; heapLimitMb: number };
  pluginLoadTimes: Record<string, number>;
  hydrationTimeMs?: number;
};

type MemoryPerformance = Performance & {
  memory?: {
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
};

class PluginProfiler {
  private started = false;
  private renderCounts = new Map<string, number>();
  private slowComponents: Array<{ id: string; durationMs: number }> = [];
  private longTasks: Array<{ durationMs: number; atMs: number }> = [];
  private pluginLoadTimes = new Map<string, number>();
  private observer?: PerformanceObserver;
  private frameId = 0;
  private frameCount = 0;
  private fps = 0;
  private lastFrameAt = 0;
  private startedAt = 0;

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.startedAt = performance.now();
    this.observeLongTasks();
    this.trackFrames();
  }

  stop() {
    this.started = false;
    this.observer?.disconnect();
    this.observer = undefined;
    if (this.frameId) cancelAnimationFrame(this.frameId);
  }

  recordRender(id: string, durationMs = 0) {
    this.renderCounts.set(id, (this.renderCounts.get(id) ?? 0) + 1);
    if (durationMs > 16) this.slowComponents.push({ id, durationMs: Math.round(durationMs) });
  }

  recordPluginLoad(pluginId: string, durationMs: number) {
    this.pluginLoadTimes.set(pluginId, Math.round(durationMs));
  }

  recordHydration(durationMs: number) {
    this.startedAt = this.startedAt || performance.now();
    this.hydrationTimeMs = Math.round(durationMs);
  }

  exportReport(): PluginProfilerReport {
    return {
      started: this.started,
      generatedAt: Date.now(),
      renderCounts: Object.fromEntries(this.renderCounts),
      slowComponents: this.slowComponents.slice(-20),
      longTasks: this.longTasks.slice(-20),
      fps: this.fps,
      memory: readMemory(),
      pluginLoadTimes: Object.fromEntries(this.pluginLoadTimes),
      hydrationTimeMs: this.hydrationTimeMs,
    };
  }

  private hydrationTimeMs?: number;

  private observeLongTasks() {
    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTasks.push({
            durationMs: Math.round(entry.duration),
            atMs: Math.round(entry.startTime),
          });
        }
      });
      this.observer.observe({ type: "longtask", buffered: true });
    } catch {
      this.observer = undefined;
    }
  }

  private trackFrames() {
    const tick = (now: number) => {
      if (!this.started) return;
      this.frameCount += 1;
      if (!this.lastFrameAt) this.lastFrameAt = now;
      const elapsed = now - this.lastFrameAt;
      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.frameCount = 0;
        this.lastFrameAt = now;
      }
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }
}

const pluginProfiler = new PluginProfiler();

export function getPluginProfiler() {
  return pluginProfiler;
}

function readMemory() {
  if (typeof performance === "undefined") return undefined;
  const memory = (performance as MemoryPerformance).memory;
  if (!memory) return undefined;
  return {
    usedHeapMb: Math.round(memory.usedJSHeapSize / 1024 / 1024),
    heapLimitMb: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
  };
}
