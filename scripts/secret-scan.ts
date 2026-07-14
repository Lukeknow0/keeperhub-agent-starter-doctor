import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

interface Finding {
  file: string;
  rule: string;
}

const forbiddenFiles = [/(^|\/)\.env($|\.)/, /(^|\/)wallet\.json$/, /(^|\/)hosts\.yml$/];
const contentRules = [
  {
    name: "organization API key",
    pattern: /\bkh_(?!your_|fixture|test|example|super_secret|acme|personal)[A-Za-z0-9_-]{20,}\b/
  },
  {
    name: "Bearer credential",
    pattern: /\bBearer\s+(?!\$\{|<|\[|kh_fixture|kh_test|token-value)[A-Za-z0-9._~-]{16,}/i
  },
  {
    name: "private key material",
    pattern: /-----BEGIN (?:EC |RSA |OPENSSH )?PRIVATE KEY-----/
  }
];

const sourceFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
  encoding: "utf8"
}).split("\0").filter(Boolean);

function filesUnder(root: string): string[] {
  if (!existsSync(root)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) results.push(...filesUnder(path));
    else if (entry.isFile()) results.push(path);
  }
  return results;
}

// Built packages and ignored runtime evidence are part of the safety surface
// even though they are intentionally absent from git ls-files.
const files = [...new Set([
  ...sourceFiles,
  ...filesUnder("dist"),
  ...filesUnder("audit"),
  ...filesUnder(".keeperhub")
])];

const findings: Finding[] = [];
for (const file of files) {
  if (file === ".env.example") continue;
  if (forbiddenFiles.some((pattern) => pattern.test(file))) {
    findings.push({ file, rule: "forbidden credential filename" });
    continue;
  }
  if (statSync(file).size > 2_000_000) continue;
  const contents = readFileSync(file, "utf8");
  for (const rule of contentRules) {
    if (rule.pattern.test(contents)) findings.push({ file, rule: rule.name });
  }
}

if (findings.length > 0) {
  for (const finding of findings) process.stderr.write(`Secret scan failed: ${finding.rule} in ${finding.file}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Secret scan passed (${files.length} files checked).\n`);
}
