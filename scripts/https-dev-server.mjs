import { existsSync, readFileSync } from "node:fs";
import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import net from "node:net";
import os from "node:os";
import { join } from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const execFileAsync = promisify(execFile);
const args = new Set(process.argv.slice(2));
const useExistingNext = args.has("--existing");
const cleanStale = !args.has("--no-clean-stale") && readFlag("SARVA_CLEAN_STALE", true);
const host = "0.0.0.0";
const defaultHttpsPort = Number(process.env.SARVA_HTTPS_PORT ?? (useExistingNext ? 3443 : 3000));
const configuredNextPort = Number(process.env.SARVA_NEXT_INTERNAL_PORT);
const managedNextStartPort = Number.isInteger(configuredNextPort) && configuredNextPort > 0
  ? configuredNextPort
  : 3001;
const nextPortCandidates = parsePortList(process.env.SARVA_NEXT_INTERNAL_PORTS)
  ?? (useExistingNext
    ? uniquePorts([configuredNextPort, 3000])
    : uniquePorts([managedNextStartPort, 3001, 3002, 3003]));
const redirectPortCandidates = parsePortList(process.env.SARVA_HTTP_REDIRECT_PORTS)
  ?? uniquePorts([Number(process.env.SARVA_HTTP_REDIRECT_PORT ?? 3080), 3081, 3082]);
const secondaryHttpsPort = Number(process.env.SARVA_SECONDARY_HTTPS_PORT ?? (defaultHttpsPort === 3000 ? 3443 : 0));
const managedNextEngine = readNextDevEngine();
const maxNextRestarts = Number(process.env.SARVA_NEXT_MAX_RESTARTS ?? 5);
const certDir = join(process.cwd(), "certs");
const keyPath = join(certDir, "key.pem");
const certPath = join(certDir, "cert.pem");

let managedNextProcess = null;
let managedNextPort = 0;
let shuttingDown = false;
let runtimeReady = false;
let nextReady = false;
let nextRestartCount = 0;
let restartingNext = false;
let nextHealthTimer = null;
const warningThrottle = new Map();
const runningServers = [];

installRuntimeSafetyHandlers();

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("");
  console.error("Nammude HTTPS LAN startup failed");
  console.error("-----------------------------------");
  console.error(`Reason: ${message}`);
  if (error instanceof StartupError && error.nextAction) {
    console.error(`Next action: ${error.nextAction}`);
  } else {
    console.error("Next action: close stale Node/Next processes or rerun run.bat to let the preflight clean them.");
  }
  console.error("Fallback: npm run dev:lan starts plain HTTP if HTTPS is not needed for this check.");
  if (process.env.SARVA_DEBUG_STARTUP === "1" && error instanceof Error && error.stack) {
    console.error("");
    console.error(error.stack);
  }
  process.exit(1);
});

async function main() {
  if (!existsSync(keyPath) || !existsSync(certPath)) {
    throw new StartupError(
      "Missing certs/key.pem or certs/cert.pem.",
      "Run npm run dev:cert, then rerun npm run dev:lan:https.",
    );
  }

  const tls = {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  };

  const nextPort = useExistingNext
    ? await resolveExistingNextPort(nextPortCandidates)
    : await resolveManagedNextPort(nextPortCandidates);
  managedNextPort = nextPort;
  console.log(`Using internal Next.js port ${nextPort}${useExistingNext ? " (existing)" : ""}.`);
  if (!useExistingNext && managedNextEngine === "webpack") {
    console.log("Turbopack is disabled for HTTPS LAN mode; using webpack dev server for Windows stability.");
  }
  const httpsPort = await resolveRequiredPublicPort(defaultHttpsPort, "HTTPS LAN");
  const additionalHttpsPorts = await resolveOptionalHttpsPorts([secondaryHttpsPort], httpsPort);
  const redirectPort = await resolveRedirectPort(redirectPortCandidates);

  if (!useExistingNext) {
    managedNextProcess = await startNextDev(nextPort);
  }

  for (const port of [httpsPort, ...additionalHttpsPorts]) {
    const server = createProxyServer(tls, port, nextPort);
    await listen(server, port, host, `HTTPS LAN proxy ${port}`);
    runningServers.push(server);
  }

  const redirectServer = createRedirectServer(httpsPort);
  await listen(redirectServer, redirectPort, host, `HTTP redirect ${redirectPort}`);
  runningServers.push(redirectServer);

  printStartupBanner({
    nextPort,
    httpsPorts: [httpsPort, ...additionalHttpsPorts],
    redirectPort,
    useExistingNext,
  });
  runtimeReady = true;

  if (!useExistingNext) {
    void waitForNextReadiness(nextPort, 60_000)
      .then(() => {
        nextReady = true;
        nextRestartCount = 0;
        console.log(`Internal Next.js is ready on http://127.0.0.1:${nextPort}`);
      })
      .catch(() => {
        console.log(`Internal Next.js is still starting on http://127.0.0.1:${nextPort}; refresh the browser in a moment.`);
      });
    startNextHealthChecks();
  }

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

async function resolveManagedNextPort(candidates) {
  for (const port of candidates) {
    if (await isPortFree(port, "127.0.0.1")) {
      return port;
    }

    const owners = await getPortOwners(port);
    const staleOwners = owners.filter((owner) => isSarvaStaleProcess(owner, port));
    if (cleanStale && staleOwners.length) {
      await killOwners(staleOwners, `internal Next.js port ${port}`);
      if (await isPortFree(port, "127.0.0.1")) {
        return port;
      }
    }

    console.log(`Internal port ${port} is busy (${describeOwners(owners)}). Trying the next candidate.`);
  }

  throw new StartupError(
    `No internal Next.js port is available. Tried ${candidates.join(", ")}.`,
    "Close the listed process, or set SARVA_NEXT_INTERNAL_PORTS=3001,3002,3003,3004.",
  );
}

async function resolveExistingNextPort(candidates) {
  for (const port of candidates) {
    if (await isPortOpen(port, "127.0.0.1", 800)) {
      return port;
    }
  }

  throw new StartupError(
    `No existing Next.js server responded on ${candidates.join(", ")}.`,
    "Start Next with npm run dev:lan, or run npm run dev:lan:https without --existing.",
  );
}

async function resolveRequiredPublicPort(port, label) {
  if (await isPortFree(port, host)) return port;

  const owners = await getPortOwners(port);
  const staleOwners = owners.filter((owner) => isSarvaStaleProcess(owner, port));
  if (cleanStale && staleOwners.length) {
    await killOwners(staleOwners, `${label} port ${port}`);
    if (await isPortFree(port, host)) return port;
  }

  throw new StartupError(
    `${label} port ${port} is already in use (${describeOwners(owners)}).`,
    `Stop that process, or set SARVA_HTTPS_PORT to another free port before starting.`,
  );
}

async function resolveOptionalHttpsPorts(candidates, primaryPort) {
  const ports = [];
  for (const port of uniquePorts(candidates)) {
    if (!Number.isInteger(port) || port <= 0 || port === primaryPort) continue;
    if (await isPortFree(port, host)) {
      ports.push(port);
      continue;
    }

    const owners = await getPortOwners(port);
    const staleOwners = owners.filter((owner) => isSarvaStaleProcess(owner, port));
    if (cleanStale && staleOwners.length) {
      await killOwners(staleOwners, `secondary HTTPS port ${port}`);
      if (await isPortFree(port, host)) {
        ports.push(port);
        continue;
      }
    }

    console.log(`Secondary HTTPS port ${port} is busy (${describeOwners(owners)}). Continuing without it.`);
  }
  return ports;
}

async function resolveRedirectPort(candidates) {
  for (const port of candidates) {
    if (await isPortFree(port, host)) return port;

    const owners = await getPortOwners(port);
    const staleOwners = owners.filter((owner) => isSarvaStaleProcess(owner, port));
    if (cleanStale && staleOwners.length) {
      await killOwners(staleOwners, `HTTP redirect port ${port}`);
      if (await isPortFree(port, host)) return port;
    }

    console.log(`HTTP redirect port ${port} is busy (${describeOwners(owners)}). Trying the next candidate.`);
  }

  throw new StartupError(
    `No HTTP redirect port is available. Tried ${candidates.join(", ")}.`,
    "Set SARVA_HTTP_REDIRECT_PORTS=3080,3081,3082,3083 or close the process using those ports.",
  );
}

async function startNextDev(nextPort) {
  const attempts = getNextStartAttempts(nextPort);
  let lastError = null;

  for (const attempt of attempts) {
    try {
      const child = await spawnNextAttempt(attempt);
      if (attempt !== attempts[0]) {
        console.log(`Internal Next.js launch recovered using ${attempt.label}.`);
      }
      return child;
    } catch (error) {
      lastError = error;
      console.log(`Internal Next.js launch via ${attempt.label} failed: ${cleanErrorMessage(error)}.`);
    }
  }

  throw new StartupError(
    `Internal Next.js could not start: ${cleanErrorMessage(lastError)}`,
    "Close stale Node/Next processes, rerun run.bat, or start Next separately with npm run dev:lan and then use npm run dev:lan:https:proxy.",
  );
}

function getNextStartAttempts(nextPort) {
  const nextJsBin = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const engineArgs = managedNextEngine === "webpack" ? ["--webpack"] : ["--turbo"];
  const alternateEngine = managedNextEngine === "webpack" ? "turbo" : "webpack";
  const alternateArgs = alternateEngine === "webpack" ? ["--webpack"] : ["--turbo"];
  const commonArgs = ["dev", "--hostname", "127.0.0.1", "--port", String(nextPort), ...engineArgs];
  const fallbackArgs = ["dev", "--hostname", "127.0.0.1", "--port", String(nextPort), ...alternateArgs];

  if (process.platform === "win32") {
    return [
      {
        label: `node next/dist/bin/next (${managedNextEngine})`,
        command: process.execPath,
        args: [nextJsBin, ...commonArgs],
      },
      {
        label: `node next/dist/bin/next (${alternateEngine} fallback)`,
        command: process.execPath,
        args: [nextJsBin, ...fallbackArgs],
      },
    ];
  }

  const nextCmd = join(process.cwd(), "node_modules", ".bin", "next");
  return [
    {
      label: `next (${managedNextEngine})`,
      command: nextCmd,
      args: commonArgs,
    },
    {
      label: `node next/dist/bin/next (${alternateEngine} fallback)`,
      command: process.execPath,
      args: [nextJsBin, ...fallbackArgs],
    },
  ];
}

function spawnNextAttempt(attempt) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let earlyExitCode = null;
    let earlyExitSignal = null;
    let child;

    const nextErrorBuffer = [];
    const startupTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (earlyExitCode !== null || earlyExitSignal) {
        reject(new Error(`exited early with ${earlyExitSignal ?? `code ${earlyExitCode}`}`));
        return;
      }
      attachManagedNextLifecycle(child, nextErrorBuffer);
      resolve(child);
    }, 1200);

    try {
      child = spawn(attempt.command, attempt.args, {
        stdio: ["inherit", "pipe", "pipe"],
        shell: false,
        env: { ...process.env },
        windowsHide: true,
      });
    } catch (error) {
      clearTimeout(startupTimer);
      reject(error);
      return;
    }

    child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr?.on("data", (chunk) => {
      const text = String(chunk);
      nextErrorBuffer.push(text);
      forwardCleanNextError(text);
    });

    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(startupTimer);
      reject(error);
    });

    child.once("exit", (code, signal) => {
      if (settled) return;
      earlyExitCode = code;
      earlyExitSignal = signal;
    });
  });
}

function attachManagedNextLifecycle(child, nextErrorBuffer) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const reason = cleanNextFailureReason(nextErrorBuffer.join("")) ?? (signal ? `stopped by ${signal}` : `exit code ${code ?? 0}`);
    if (isRecoverableNextExit(reason, code, signal)) {
      console.log(`Internal Next.js stopped${nextReady ? "" : " before readiness"}. Reason: ${reason}`);
      void restartManagedNext(reason);
      return;
    }
    console.error(`Internal Next.js stopped with an unrecoverable status. Reason: ${reason}`);
    void shutdown("next-exit", code ?? 1);
  });

  child.on("error", (error) => {
    if (shuttingDown) return;
    const reason = cleanErrorMessage(error);
    console.error(`Internal Next.js process error: ${reason}`);
    void restartManagedNext(reason);
  });
}

function isRecoverableNextExit(reason, code, signal) {
  if (shuttingDown || signal === "SIGINT" || signal === "SIGTERM") return false;
  if (code === 0 && nextReady) return false;
  return (
    code === null ||
    code === 1 ||
    code === -1 ||
    code === 4294967295 ||
    /spawn EPERM|EPERM|worker|turbopack|socket|ECONNRESET|EPIPE|exit code 4294967295|exit code -1/i.test(String(reason))
  );
}

async function restartManagedNext(reason) {
  if (useExistingNext || shuttingDown || restartingNext) return;
  restartingNext = true;
  nextReady = false;
  nextRestartCount += 1;

  if (nextRestartCount > maxNextRestarts) {
    console.error(`Internal Next.js restart limit reached after ${maxNextRestarts} attempt(s). Last reason: ${reason}`);
    await shutdown("next-restart-limit", 1);
    return;
  }

  const backoffMs = Math.min(8_000, 1_000 * nextRestartCount);
  console.log(`Recovering internal Next.js (${nextRestartCount}/${maxNextRestarts}) in ${backoffMs}ms...`);
  await delay(backoffMs);

  try {
    await freeManagedNextPort(managedNextPort);
    managedNextProcess = await startNextDev(managedNextPort);
    await waitForNextReadiness(managedNextPort, 60_000);
    nextReady = true;
    nextRestartCount = 0;
    console.log(`Internal Next.js recovered on http://127.0.0.1:${managedNextPort}.`);
  } catch (error) {
    console.error(`Internal Next.js recovery attempt failed: ${cleanErrorMessage(error)}`);
    restartingNext = false;
    void restartManagedNext(cleanErrorMessage(error));
    return;
  }

  restartingNext = false;
}

async function freeManagedNextPort(port) {
  const owners = await getPortOwners(port);
  const staleOwners = owners.filter((owner) => isSarvaStaleProcess(owner, port));
  if (staleOwners.length) {
    await killOwners(staleOwners, `internal Next.js restart port ${port}`);
  }
}

function forwardCleanNextError(text) {
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (isStackTraceLine(line)) continue;
    process.stderr.write(`${line}\n`);
  }
}

function isStackTraceLine(line) {
  return (
    /^\s+at\s/.test(line) ||
    /^\s*(errno|code|syscall):/.test(line) ||
    /^\s*\}\s*$/.test(line) ||
    /^\s*\{\s*$/.test(line)
  );
}

function cleanNextFailureReason(output) {
  const firstUsefulLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) =>
      line &&
      !isStackTraceLine(line) &&
      !/^next\.js/i.test(line) &&
      !/^[-\s]*$/i.test(line)
    );

  return firstUsefulLine
    ?.replace(/^Error:\s*/i, "")
    .replace(/^Error\s+/i, "");
}

function cleanErrorMessage(error) {
  if (!error) return "unknown error";
  if (error instanceof Error) return error.message.replace(/\s+/g, " ").trim();
  return String(error).replace(/\s+/g, " ").trim();
}

function createProxyServer(tls, httpsPort, nextPort) {
  const httpsServer = createHttpsServer(tls, (clientRequest, clientResponse) => {
    clientRequest.on("aborted", () => {
      clientResponse.destroy();
    });
    clientRequest.on("error", (error) => {
      if (isTransientNetworkError(error)) {
        logTransientNetworkWarning("client request", error);
        clientResponse.destroy();
        return;
      }
      console.error(`HTTPS client request error on ${httpsPort}: ${cleanErrorMessage(error)}`);
    });
    clientResponse.on("error", (error) => {
      if (isTransientNetworkError(error)) {
        logTransientNetworkWarning("client response", error);
        return;
      }
      console.error(`HTTPS client response error on ${httpsPort}: ${cleanErrorMessage(error)}`);
    });

    const upstream = httpRequest(
      {
        hostname: "127.0.0.1",
        port: nextPort,
        method: clientRequest.method,
        path: clientRequest.url,
        headers: {
          ...clientRequest.headers,
          host: `127.0.0.1:${nextPort}`,
          "x-forwarded-proto": "https",
          "x-forwarded-host": clientRequest.headers.host ?? `localhost:${httpsPort}`,
        },
      },
      (upstreamResponse) => {
        upstreamResponse.on("error", (error) => {
          if (isTransientNetworkError(error)) {
            logTransientNetworkWarning("upstream response", error);
            clientResponse.destroy();
            return;
          }
          console.error(`HTTPS upstream response error on ${httpsPort}: ${cleanErrorMessage(error)}`);
        });
        clientResponse.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(clientResponse);
      },
    );

    upstream.on("error", (error) => {
      if (isTransientNetworkError(error)) {
        logTransientNetworkWarning("upstream request", error);
      } else {
        console.error(`HTTPS upstream request error on ${httpsPort}: ${cleanErrorMessage(error)}`);
      }
      if (!clientResponse.destroyed) {
        if (!clientResponse.headersSent) clientResponse.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
        clientResponse.end("Nammude is starting. Refresh in a moment.");
      }
    });

    clientResponse.on("close", () => upstream.destroy());
    clientRequest.pipe(upstream);
  });

  httpsServer.on("upgrade", (request, socket, head) => {
    const upstream = net.connect(nextPort, "127.0.0.1", () => {
      upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`);
      const headers = {
        ...request.headers,
        host: `127.0.0.1:${nextPort}`,
        "x-forwarded-proto": "https",
        "x-forwarded-host": request.headers.host ?? `localhost:${httpsPort}`,
      };
      for (const [key, value] of Object.entries(headers)) {
        if (Array.isArray(value)) {
          value.forEach((entry) => upstream.write(`${key}: ${entry}\r\n`));
        } else if (value) {
          upstream.write(`${key}: ${value}\r\n`);
        }
      }
      upstream.write("\r\n");
      upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });

    socket.on("error", (error) => {
      logTransientNetworkWarning("websocket client", error);
      upstream.destroy();
    });
    socket.on("close", () => upstream.destroy());
    upstream.on("error", (error) => {
      logTransientNetworkWarning("websocket upstream", error);
      socket.destroy();
    });
  });

  httpsServer.on("clientError", (error, socket) => {
    if (isHttpOnHttpsError(error)) {
      redirectPlainHttpSocket(socket, httpsPort, "HTTPS client");
      return;
    }
    logTransientNetworkWarning(`HTTPS client on ${httpsPort}`, error);
    socket.destroy();
  });

  httpsServer.on("tlsClientError", (error, socket) => {
    if (isHttpOnHttpsError(error)) {
      redirectPlainHttpSocket(socket, httpsPort, "TLS client");
      return;
    }
    logTransientNetworkWarning(`TLS client on ${httpsPort}`, error);
    socket.destroy();
  });

  httpsServer.on("connection", (socket) => {
    socket.on("error", (error) => {
      logTransientNetworkWarning(`HTTPS connection on ${httpsPort}`, error);
    });
  });

  httpsServer.on("error", (error) => {
    if (shuttingDown) return;
    if (isTransientNetworkError(error)) {
      logTransientNetworkWarning(`HTTPS proxy on ${httpsPort}`, error);
      return;
    }
    console.error(`HTTPS proxy error on ${httpsPort}: ${error.message}`);
  });

  return createHttpAwareTlsServer(httpsServer, httpsPort);
}

function createHttpAwareTlsServer(httpsServer, httpsPort) {
  const tcpServer = net.createServer((socket) => {
    socket.once("data", (chunk) => {
      if (isPlainHttpChunk(chunk)) {
        redirectPlainHttpSocket(socket, httpsPort, "Plain HTTP client", chunk);
        return;
      }
      socket.pause();
      socket.unshift(chunk);
      httpsServer.emit("connection", socket);
    });
    socket.on("error", (error) => {
      logTransientNetworkWarning(`TCP front door on ${httpsPort}`, error);
    });
  });

  tcpServer.on("error", (error) => {
    if (shuttingDown) return;
    if (isTransientNetworkError(error)) {
      logTransientNetworkWarning(`TCP front door on ${httpsPort}`, error);
      return;
    }
    console.error(`HTTPS proxy error on ${httpsPort}: ${cleanErrorMessage(error)}`);
  });

  return tcpServer;
}

function createRedirectServer(httpsPort) {
  const server = createHttpServer((request, response) => {
    const hostHeader = request.headers.host ?? "localhost";
    const hostname = hostHeader.replace(/:\d+$/, "");
    const portSuffix = httpsPort === 443 ? "" : `:${httpsPort}`;
    response.writeHead(308, {
      Location: `https://${hostname}${portSuffix}${request.url ?? "/"}`,
      "Connection": "close",
      "Cache-Control": "no-store",
    });
    response.end();
  });
  server.on("clientError", (error, socket) => {
    logTransientNetworkWarning("HTTP redirect client", error);
    socket.destroy();
  });
  server.on("connection", (socket) => {
    socket.on("error", (error) => {
      logTransientNetworkWarning("HTTP redirect connection", error);
    });
  });
  return server;
}

function listen(server, port, listenHost, label) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(new StartupError(
        `${label} could not bind ${listenHost}:${port}: ${error.message}`,
        "Rerun run.bat to clean stale processes, or choose a free port through the SARVA_*_PORT environment variables.",
      ));
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, listenHost);
  });
}

async function waitForNextReadiness(port, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await probeNextHttp(port, 1200)) return;
    await delay(650);
  }
  throw new Error(`Timed out waiting for internal Next.js on 127.0.0.1:${port}`);
}

function probeNextHttp(port, timeoutMs) {
  return new Promise((resolve) => {
    const request = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        method: "GET",
        path: "/",
        timeout: timeoutMs,
        headers: { accept: "text/html", "user-agent": "sarva-healthcheck" },
      },
      (response) => {
        response.resume();
        resolve(Boolean(response.statusCode && response.statusCode < 500));
      },
    );
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
    request.end();
  });
}

function startNextHealthChecks() {
  if (nextHealthTimer) clearInterval(nextHealthTimer);
  nextHealthTimer = setInterval(() => {
    if (shuttingDown || restartingNext || !managedNextPort) return;
    void isPortOpen(managedNextPort, "127.0.0.1", 800).then((open) => {
      if (shuttingDown || restartingNext) return;
      if (!open) {
        nextReady = false;
        void restartManagedNext("internal port health check failed");
      }
    });
  }, 15_000);
  nextHealthTimer.unref?.();
}

function isPortFree(port, listenHost) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen({ port, host: listenHost, exclusive: true });
  });
}

function isPortOpen(port, hostname, timeoutMs) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: hostname });
    const done = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function getPortOwners(port) {
  try {
    const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"], {
      windowsHide: true,
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
    });
    const pids = new Set();
    for (const line of stdout.split(/\r?\n/)) {
      if (!/\bLISTENING\b/i.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const localAddress = parts[1] ?? "";
      const pid = Number(parts.at(-1));
      if (extractPort(localAddress) === port && Number.isInteger(pid)) pids.add(pid);
    }
    const owners = await Promise.all([...pids].map((pid) => getProcessInfo(pid, stdout)));
    return owners.filter(Boolean);
  } catch {
    return [];
  }
}

function extractPort(address) {
  const index = address.lastIndexOf(":");
  return index >= 0 ? Number(address.slice(index + 1)) : NaN;
}

async function getProcessInfo(pid, netstatOutput = "") {
  if (process.platform === "win32") {
    try {
      const command = `$p=Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object ProcessId,Name,CommandLine;if($p){$p|ConvertTo-Json -Compress}`;
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command], {
        windowsHide: true,
        timeout: 5_000,
        maxBuffer: 1024 * 1024,
      });
      if (!stdout.trim()) return { pid };
      const parsed = JSON.parse(stdout.trim());
      return {
        pid: Number(parsed.ProcessId ?? pid),
        name: parsed.Name,
        commandLine: parsed.CommandLine,
        listeningPorts: extractOwnedPorts(netstatOutput, pid),
      };
    } catch {
      return {
        pid,
        name: await getWindowsProcessName(pid),
        listeningPorts: extractOwnedPorts(netstatOutput, pid),
      };
    }
  }

  try {
    const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "comm=", "-o", "args="], {
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
    });
    const [name = "", ...rest] = stdout.trim().split(/\s+/);
    return { pid, name, commandLine: rest.join(" "), listeningPorts: extractOwnedPorts(netstatOutput, pid) };
  } catch {
    return { pid, listeningPorts: extractOwnedPorts(netstatOutput, pid) };
  }
}

function isSarvaStaleProcess(owner, port) {
  const command = normalizePath(owner.commandLine ?? "");
  const name = String(owner.name ?? "").toLowerCase();
  const cwd = normalizePath(process.cwd());
  const fromThisWorkspace = command.includes(cwd);
  const isNodeLike = /node|next|cmd|powershell/.test(name) || /node|next/.test(command);
  const isLauncher = command.includes("scripts/https-dev-server.mjs") || command.includes("scripts\\https-dev-server.mjs");
  const isNextDev = (
    command.includes("next") &&
    command.includes("dev") &&
    (
      command.includes(`--port ${port}`) ||
      command.includes(`--port=${port}`) ||
      command.includes(` -p ${port}`) ||
      command.includes(`:${port}`)
    )
  );
  const isLikelyPreviousLauncher = !command && isNodeLike && ownsSarvaPublicPorts(owner, port);

  return owner.pid !== process.pid && isNodeLike && (isLauncher || fromThisWorkspace || isNextDev || isLikelyPreviousLauncher);
}

async function getWindowsProcessName(pid) {
  try {
    const { stdout } = await execFileAsync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
      windowsHide: true,
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
    });
    const line = stdout.split(/\r?\n/).find((entry) => entry.trim() && !/no tasks/i.test(entry));
    return line?.match(/^"([^"]+)"/)?.[1];
  } catch {
    return undefined;
  }
}

function extractOwnedPorts(netstatOutput, pid) {
  const ports = [];
  for (const line of netstatOutput.split(/\r?\n/)) {
    if (!/\bLISTENING\b/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const ownerPid = Number(parts.at(-1));
    if (ownerPid !== pid) continue;
    const port = extractPort(parts[1] ?? "");
    if (Number.isInteger(port)) ports.push(port);
  }
  return uniquePorts(ports);
}

function ownsSarvaPublicPorts(owner, port) {
  const ports = owner.listeningPorts ?? [];
  const ownsCurrent = ports.includes(port);
  const ownsRedirectOrSecondary = redirectPortCandidates.some((candidate) => ports.includes(candidate)) || ports.includes(secondaryHttpsPort);
  return ownsCurrent && ownsRedirectOrSecondary;
}

function normalizePath(value) {
  return value.replace(/\\/g, "/").toLowerCase();
}

async function killOwners(owners, label) {
  for (const owner of owners) {
    console.log(`Cleaning stale ${label}: PID ${owner.pid}${owner.name ? ` (${owner.name})` : ""}`);
    await killProcessTree(owner.pid);
  }
  await delay(800);
}

async function killProcessTree(pid) {
  if (!pid || pid === process.pid) return;
  if (process.platform === "win32") {
    await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      timeout: 8_000,
    }).catch(() => undefined);
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
    await delay(1200);
  } catch {
    return;
  }
  try {
    process.kill(pid, 0);
    process.kill(pid, "SIGKILL");
  } catch {
    // Process exited after SIGTERM.
  }
}

function describeOwners(owners) {
  if (!owners.length) return "owner not reported by netstat";
  return owners
    .map((owner) => `PID ${owner.pid}${owner.name ? ` ${owner.name}` : ""}`)
    .join(", ");
}

function printStartupBanner({ nextPort, httpsPorts, redirectPort, useExistingNext: existing }) {
  const lanAddresses = getLanAddresses();
  console.log("");
  console.log("Nammude HTTPS LAN test URLs");
  console.log("------------------------------");
  console.log(`Internal Next.js: http://127.0.0.1:${nextPort}${existing ? " (existing)" : ""}`);
  for (const port of httpsPorts) {
    console.log(`Local HTTPS:     https://localhost:${port}`);
    for (const address of lanAddresses) {
      console.log(`LAN HTTPS:       https://${address}:${port}`);
    }
  }
  console.log(`HTTP redirect:   http://localhost:${redirectPort} -> https://localhost:${httpsPorts[0]}`);
  if (!lanAddresses.length) {
    console.log("LAN diagnostic:  no active IPv4 address found. Connect to WiFi and restart.");
  } else {
    console.log("LAN diagnostic:  phone and computer must be on the same WiFi/VLAN.");
  }
  console.log("Certificate:     accept the local dev certificate once on each test browser.");
  console.log("GPS/PWA:         HTTPS is active, so geolocation and service worker APIs can run.");
  console.log("");
}

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address)
    .filter((value, index, values) => values.indexOf(value) === index);
}

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log("");
  console.log(`Stopping Nammude HTTPS LAN mode (${signal})...`);
  if (nextHealthTimer) clearInterval(nextHealthTimer);
  await closeServers();
  if (managedNextProcess?.pid) {
    await killProcessTree(managedNextProcess.pid);
  }
  process.exit(exitCode);
}

async function closeServers() {
  await Promise.all(runningServers.map((server) => new Promise((resolve) => server.close(() => resolve()))));
}

function installRuntimeSafetyHandlers() {
  process.on("uncaughtException", (error) => {
    if (runtimeReady && isTransientNetworkError(error)) {
      logTransientNetworkWarning("uncaught runtime socket", error);
      return;
    }
    console.error(`Fatal HTTPS dev runtime error: ${cleanErrorMessage(error)}`);
    if (process.env.SARVA_DEBUG_STARTUP === "1" && error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    if (runtimeReady && isTransientNetworkError(reason)) {
      logTransientNetworkWarning("unhandled runtime socket rejection", reason);
      return;
    }
    console.error(`Fatal HTTPS dev unhandled rejection: ${cleanErrorMessage(reason)}`);
    process.exit(1);
  });
}

function isTransientNetworkError(error) {
  const maybe = error ?? {};
  const code = typeof maybe.code === "string" ? maybe.code : "";
  const syscall = typeof maybe.syscall === "string" ? maybe.syscall : "";
  const message = cleanErrorMessage(error);
  return (
    [
      "ECONNRESET",
      "ECONNABORTED",
      "EPIPE",
      "ETIMEDOUT",
      "ERR_STREAM_PREMATURE_CLOSE",
      "HPE_INVALID_EOF_STATE",
    ].includes(code) ||
    (syscall === "read" && /ECONNRESET/i.test(message)) ||
    /socket hang up|aborted|premature close|TLS|SSL|ECONNRESET|EPIPE/i.test(message)
  );
}

function logTransientNetworkWarning(scope, error) {
  if (shuttingDown) return;
  if (isHttpOnHttpsError(error)) {
    logThrottledWarning("http-on-https", "HTTP traffic reached an HTTPS port; redirecting to the HTTPS URL.");
    return;
  }
  const networkMessage = cleanNetworkMessage(error);
  if (!isTransientNetworkError(error)) {
    logThrottledWarning(`warn:${scope}:${networkMessage}`, `Nammude HTTPS dev warning (${scope}): ${networkMessage}`);
    return;
  }
  logThrottledWarning(`transient:${scope}:${networkMessage}`, `Nammude HTTPS dev recovered ${scope} disconnect: ${networkMessage}`);
}

function isHttpOnHttpsError(error) {
  const maybe = error ?? {};
  const code = typeof maybe.code === "string" ? maybe.code : "";
  const message = cleanErrorMessage(error);
  return code === "ERR_SSL_HTTP_REQUEST" || /http request|wrong version number|ssl3_get_record/i.test(message);
}

function isPlainHttpChunk(chunk) {
  const text = chunk.toString("latin1", 0, Math.min(chunk.length, 16));
  return /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE|CONNECT)\s/u.test(text);
}

function redirectPlainHttpSocket(socket, httpsPort, scope, firstChunk) {
  if (shuttingDown) return;
  const requestText = firstChunk ? String(firstChunk) : "";
  const requestTarget = requestText.match(/^[A-Z]+\s+(\S+)/u)?.[1] ?? "/";
  const hostHeader = requestText.match(/\r?\nhost:\s*([^\r\n]+)/iu)?.[1]?.trim();
  const hostName = hostHeader?.replace(/:\d+$/, "") || normalizeRedirectAddress(socket.localAddress);
  const location = `https://${hostName}${httpsPort === 443 ? "" : `:${httpsPort}`}${requestTarget.startsWith("/") ? requestTarget : "/"}`;
  logThrottledWarning(`http-on-https:${httpsPort}`, `${scope} sent plain HTTP to HTTPS port ${httpsPort}; replying with a clean HTTPS redirect.`);
  try {
    socket.write(
      `HTTP/1.1 308 Permanent Redirect\r\nLocation: ${location}\r\nConnection: close\r\nCache-Control: no-store\r\nContent-Length: 0\r\n\r\n`,
    );
  } catch {
    // Socket may already be closed by the TLS parser.
  } finally {
    socket.destroy();
  }
}

function normalizeRedirectAddress(value) {
  if (!value || value === "0.0.0.0" || value === "::") return "localhost";
  if (value === "::1") return "localhost";
  return value.includes(":") ? `[${value}]` : value;
}

function logThrottledWarning(key, message, windowMs = 10_000) {
  const now = Date.now();
  const last = warningThrottle.get(key) ?? 0;
  if (now - last < windowMs) return;
  warningThrottle.set(key, now);
  console.warn(message);
}

function cleanNetworkMessage(error) {
  const maybe = error ?? {};
  const code = typeof maybe.code === "string" ? maybe.code : "";
  const message = cleanErrorMessage(error);
  if (/certificate unknown|alert number 46/i.test(message)) return "client rejected the local development certificate";
  if (/ssl3_get_record|http request|ERR_SSL_HTTP_REQUEST/i.test(message)) return "plain HTTP reached an HTTPS port";
  if (/ECONNRESET|socket hang up/i.test(message)) return "socket closed by client";
  if (/EPIPE/i.test(message)) return "client disconnected while writing";
  if (/aborted|premature close/i.test(message)) return "request was aborted";
  return code ? `${code}: ${message.split(/\r?\n/u)[0]}` : message.split(/\r?\n/u)[0];
}

function parsePortList(value) {
  if (!value) return null;
  const ports = uniquePorts(value.split(",").map((entry) => Number(entry.trim())));
  return ports.length ? ports : null;
}

function uniquePorts(values) {
  return [...new Set(values.filter((port) => Number.isInteger(port) && port > 0 && port < 65536))];
}

function readFlag(name, fallback) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

function readNextDevEngine() {
  const requested = String(process.env.SARVA_NEXT_DEV_ENGINE ?? "").trim().toLowerCase();
  if (requested === "turbo" || requested === "turbopack") return "turbo";
  if (requested === "webpack") return "webpack";
  if (readFlag("SARVA_ENABLE_TURBOPACK", false)) return "turbo";
  return "webpack";
}

class StartupError extends Error {
  constructor(message, nextAction) {
    super(message);
    this.name = "StartupError";
    this.nextAction = nextAction;
  }
}
