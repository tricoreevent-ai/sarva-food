import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import os from "node:os";

const certDir = join(process.cwd(), "certs");
const keyPath = join(certDir, "key.pem");
const certPath = join(certDir, "cert.pem");

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

function ensureOpenSsl() {
  const command = findOpenSsl();
  if (!command) {
    throw new Error("OpenSSL is required to generate local HTTPS certificates. Install OpenSSL and retry npm run dev:cert.");
  }
  return command;
}

function findOpenSsl() {
  const candidates = [
    "openssl",
    "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
    "C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe",
    "C:\\Program Files\\OpenSSL-Win32\\bin\\openssl.exe",
  ];
  for (const candidate of candidates) {
    if (candidate !== "openssl" && !existsSync(candidate)) continue;
    const result = spawnSync(candidate, ["version"], { stdio: "ignore" });
    if (result.status === 0) return candidate;
  }
  return null;
}

if (existsSync(keyPath) && existsSync(certPath)) {
  console.log(`Using existing local HTTPS certificate: ${certPath}`);
  process.exit(0);
}

const openSslCommand = ensureOpenSsl();
mkdirSync(certDir, { recursive: true });

const lanAddresses = getLanAddresses();
const subjectAltName = [
  "DNS:localhost",
  "IP:127.0.0.1",
  "IP:0.0.0.0",
  ...lanAddresses.map((address) => `IP:${address}`),
].join(",");

const result = spawnSync(
  openSslCommand,
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-sha256",
    "-days",
    "365",
    "-keyout",
    keyPath,
    "-out",
    certPath,
    "-subj",
    "/CN=localhost",
    "-addext",
    `subjectAltName=${subjectAltName}`,
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  throw new Error("OpenSSL failed to create local HTTPS certificates.");
}

console.log(`Created local HTTPS key: ${keyPath}`);
console.log(`Created local HTTPS cert: ${certPath}`);
