import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export function ensureMiddlewareArtifacts(root = process.cwd()) {
  return {
    runtime: ensureMiddlewareRuntime(root),
    proxyTrace: ensureProxyTrace(root),
    trace: ensureMiddlewareTrace(root),
    globalErrorTrace: ensureAppPageTrace(root, "_global-error"),
  };
}

function ensureMiddlewareRuntime(root) {
  const serverDir = path.join(root, ".next", "server");
  if (!existsSync(serverDir)) return false;

  const middlewarePath = path.join(serverDir, "middleware.js");
  if (existsSync(middlewarePath)) return true;

  const proxyPath = path.join(serverDir, "proxy.js");
  if (!existsSync(proxyPath)) return false;

  copyFileSync(proxyPath, middlewarePath);
  const proxyMapPath = `${proxyPath}.map`;
  if (existsSync(proxyMapPath)) copyFileSync(proxyMapPath, `${middlewarePath}.map`);
  return true;
}

function ensureMiddlewareTrace(root) {
  const serverDir = path.join(root, ".next", "server");
  if (!existsSync(serverDir)) return false;

  const tracePath = path.join(serverDir, "middleware.js.nft.json");
  if (existsSync(tracePath)) return true;

  const proxyTracePath = path.join(serverDir, "proxy.js.nft.json");
  if (existsSync(proxyTracePath)) {
    const proxyTrace = JSON.parse(readFileSync(proxyTracePath, "utf8"));
    proxyTrace.files = Array.isArray(proxyTrace.files)
      ? proxyTrace.files.map((file) => (file === "proxy.js" ? "middleware.js" : file))
      : [];
    writeFileSync(tracePath, JSON.stringify(proxyTrace, null, 2));
    return true;
  }

  mkdirSync(serverDir, { recursive: true });
  writeFileSync(tracePath, JSON.stringify({ version: 1, files: [] }, null, 2));
  return true;
}

function ensureProxyTrace(root) {
  const serverDir = path.join(root, ".next", "server");
  if (!existsSync(serverDir)) return false;

  const proxyTracePath = path.join(serverDir, "proxy.js.nft.json");
  if (existsSync(proxyTracePath)) return true;

  const middlewareTracePath = path.join(serverDir, "middleware.js.nft.json");
  if (existsSync(middlewareTracePath)) {
    const middlewareTrace = JSON.parse(readFileSync(middlewareTracePath, "utf8"));
    middlewareTrace.files = Array.isArray(middlewareTrace.files)
      ? middlewareTrace.files.map((file) => (file === "middleware.js" ? "proxy.js" : file))
      : [];
    writeFileSync(proxyTracePath, JSON.stringify(middlewareTrace, null, 2));
    return true;
  }

  mkdirSync(serverDir, { recursive: true });
  writeFileSync(proxyTracePath, JSON.stringify({ version: 1, files: ["proxy.js"] }, null, 2));
  return true;
}

function ensureAppPageTrace(root, route) {
  const routeDir = path.join(root, ".next", "server", "app", route);
  const tracePath = path.join(routeDir, "page.js.nft.json");
  if (existsSync(tracePath)) return true;

  mkdirSync(routeDir, { recursive: true });
  const pagePath = path.join(routeDir, "page.js");
  const files = existsSync(pagePath) ? ["page.js"] : [];
  writeFileSync(tracePath, JSON.stringify({ version: 1, files }, null, 2));
  return true;
}
