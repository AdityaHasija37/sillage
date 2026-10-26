#!/usr/bin/env node
// SEC-03: fail if a server-only secret (or its variable name) appears in the browser bundle.
// Run after `next build`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile(".env.local");
} catch {}
const dir = ".next/static";
const secrets = ["SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "SERPAPI_API_KEY", "RATE_SALT"]
  .flatMap((name) => [name, process.env[name]])
  .filter((v) => v && v.length >= 8);
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : files.push(path.join(d, f))));
walk(dir);
const leaks = [];
for (const f of files.filter((f) => /\.(js|css|html|json)$/.test(f))) {
  const text = readFileSync(f, "utf8");
  for (const s of secrets) if (text.includes(s)) leaks.push(`${f}: contains ${s.startsWith("ey") || s.length > 40 ? "a secret value" : s}`);
}
if (leaks.length) {
  console.error(`SEC-03 failed:\n${leaks.join("\n")}`);
  process.exit(1);
}
console.log(`SEC-03 passed: ${files.length} client files checked, no server secrets found.`);
