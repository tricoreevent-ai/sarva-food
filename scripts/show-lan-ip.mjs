import os from "node:os";

const interfaces = os.networkInterfaces();
const addresses = Object.values(interfaces)
  .flat()
  .filter(Boolean)
  .filter((entry) => entry.family === "IPv4" && !entry.internal)
  .map((entry) => entry.address);

console.log("");
console.log("Food Gedi LAN test URLs");
console.log("------------------------");
console.log("Local:   http://localhost:3000");
console.log("Secure:  https://localhost:3000");

if (!addresses.length) {
  console.log("Network: no active IPv4 address found. Connect to WiFi and retry.");
} else {
  for (const address of addresses) {
    console.log(`Network: http://${address}:3000`);
    console.log(`Secure:  https://${address}:3000`);
  }
}

console.log("");
console.log("Start with: npm run dev:lan");
console.log("For mobile GPS/PWA testing, use: npm run dev:lan:https");
console.log("");
