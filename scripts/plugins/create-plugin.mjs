import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = ""] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));
const root = path.resolve(args.get("root") || process.cwd());

const interactive = process.stdin.isTTY && !args.get("id");
const answers = interactive ? await ask() : {};
const id = normalize(args.get("id") || answers.id || "developer-sample-plugin");
const title = args.get("name") || answers.name || titleCase(id);
const flag = normalizeFlag(args.get("flag") || answers.flag || `ENABLE_${id.toUpperCase().replace(/-/g, "_")}`);
const dir = path.join(root, "src", "plugins", id);

mkdirSync(dir, { recursive: true });
for (const subdir of ["docs", "examples", "hooks", "routes", "services", "tests", "types", "ui"]) {
  mkdirSync(path.join(dir, subdir), { recursive: true });
}

write("metadata.ts", metadata(id, title, flag));
write("feature-flag.ts", `export const ${camel(id)}Flag = "${flag}" as const;\n`);
write("plugin.ts", plugin(id));
write("config.defaults.ts", "export const defaultConfig = {};\n");
write("config.schema.ts", "export const configSchema = { version: 1, fields: {} };\n");
write("validator.ts", "export function validatePlugin() {\n  return { passed: true, warnings: [], errors: [] };\n}\n");
write("routes/runtime.tsx", "export function Runtime() {\n  return null;\n}\n");
write("hooks/index.ts", "export {};\n");
write("services/index.ts", "export {};\n");
write("types/index.ts", "export type PluginConfig = Record<string, never>;\n");
write("ui/index.tsx", "export function Widget() {\n  return null;\n}\n");
write("tests/README.md", `# ${title} Tests\n\nRun \`npm run test:enhancements\`.\n`);
write("docs/README.md", `# ${title}\n\nGenerated Sarva plugin scaffold.\n`);
write("examples/README.md", `# ${title} Examples\n\nAdd SDK-only usage examples here.\n`);
write("README.md", `# ${title}\n\nGenerated with \`npm run plugin:create\`.\n`);

console.log(`[plugin:create] Created ${path.relative(root, dir)}`);

function write(file, content) {
  writeFileSync(path.join(dir, file), content);
}

async function ask() {
  const rl = createInterface({ input, output });
  try {
    return {
      id: await rl.question("Plugin id: "),
      name: await rl.question("Display name: "),
      flag: await rl.question("Feature flag: "),
    };
  } finally {
    rl.close();
  }
}

function metadata(id, title, flag) {
  return `import type { PluginMetadata } from "@/plugins/core/metadata/types";\n\nexport const metadata = {\n  id: "${id}",\n  name: "${id}",\n  displayName: "${title}",\n  description: "Generated Sarva plugin.",\n  author: "Sarva",\n  company: "Sarva",\n  version: "1.0.0",\n  license: "Proprietary",\n  category: "developer",\n  priority: "P3",\n  dependencies: [],\n  peerDependencies: [],\n  optionalDependencies: [],\n  softDependencies: [],\n  developmentDependencies: [],\n  permissions: ["developer"],\n  featureFlag: "${flag}" as PluginMetadata["featureFlag"],\n  minimumPluginRuntime: "2.0.0",\n  compatiblePlatforms: ["web"],\n  supportedModules: ["developer"],\n  entry: "@/plugins/${id}/plugin",\n  screenshots: [],\n  documentation: "src/plugins/${id}/docs/README.md",\n  keywords: ["generated"],\n  tags: ["generated"],\n  bundleSize: 0,\n  checksum: "local-development",\n  signature: "local-development",\n  installSize: 0,\n  health: "unknown",\n  status: "available",\n} satisfies PluginMetadata;\n`;
}

function plugin(id) {
  return `import { definePlugin } from "@/plugins/core/sdk";\nimport { metadata } from "./metadata";\n\nexport default definePlugin({\n  metadata,\n  activate(context) {\n    context.logger.info("${id} activated");\n  },\n  healthCheck: () => ({ status: "healthy" }),\n});\n`;
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeFlag(value) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function camel(value) {
  return normalize(value).replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

function titleCase(value) {
  return normalize(value).split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}
