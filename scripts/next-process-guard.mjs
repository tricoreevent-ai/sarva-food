import { execFileSync } from "node:child_process";

function normalizeText(value) {
  return String(value ?? "").toLowerCase().replaceAll("\\", "/");
}

export function getWorkspaceNextDevProcesses(rootDir) {
  const rootText = normalizeText(rootDir);
  const processes = getProcessList();
  const workspaceNextProcesses = processes.filter((processInfo) => {
    const command = normalizeText(processInfo.commandLine);
    const name = normalizeText(processInfo.name);
    return processInfo.pid !== process.pid
      && command.includes(rootText)
      && (command.includes("next") || name.includes("node"));
  });

  const devProcesses = workspaceNextProcesses.filter((processInfo) => {
    const command = normalizeText(processInfo.commandLine);
    return command.includes("next") && command.includes(" dev");
  });
  const devPids = new Set(devProcesses.map((processInfo) => processInfo.pid));
  const childProcesses = workspaceNextProcesses.filter((processInfo) => devPids.has(processInfo.parentPid));

  return [...devProcesses, ...childProcesses].sort((a, b) => a.pid - b.pid);
}

function getProcessList() {
  if (process.platform === "win32") return getWindowsProcessList();
  return getUnixProcessList();
}

function getWindowsProcessList() {
  const command = [
    "Get-CimInstance Win32_Process | ForEach-Object {",
    "[pscustomobject]@{",
    "pid=$_.ProcessId;",
    "parentPid=$_.ParentProcessId;",
    "name=$_.Name;",
    "commandLine=$_.CommandLine",
    "} | ConvertTo-Json -Compress",
    "}",
  ].join(" ");

  try {
    const output = execFileSync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      command,
    ], {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });

    return parseJsonLines(output);
  } catch {
    return [];
  }
}

function getUnixProcessList() {
  try {
    const output = execFileSync("ps", ["-eo", "pid=,ppid=,comm=,args="], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
        if (!match) return null;
        return {
          pid: Number(match[1]),
          parentPid: Number(match[2]),
          name: match[3],
          commandLine: match[4],
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function parseJsonLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line);
        return {
          pid: Number(parsed.pid),
          parentPid: Number(parsed.parentPid),
          name: parsed.name,
          commandLine: parsed.commandLine,
        };
      } catch {
        return null;
      }
    })
    .filter((processInfo) => processInfo && Number.isFinite(processInfo.pid));
}

export function describeProcesses(processes) {
  return processes
    .map((processInfo) => `PID ${processInfo.pid}${processInfo.name ? ` ${processInfo.name}` : ""}`)
    .join(", ");
}
