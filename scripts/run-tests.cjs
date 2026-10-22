const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const files = fs.readdirSync(__dirname)
  .filter((name) => /^test-.*\.cjs$/.test(name))
  .sort()
  .map((name) => path.join(__dirname, name));
const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
