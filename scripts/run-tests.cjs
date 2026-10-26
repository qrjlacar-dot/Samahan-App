const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const testDirectory = path.resolve(__dirname, "../tests");

const files = fs
  .readdirSync(testDirectory)
  .filter((name) => /^test-.*\.cjs$/.test(name))
  .sort()
  .map((name) => path.join(testDirectory, name));
const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
if (result.error) {
  console.error(result.error.message);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
