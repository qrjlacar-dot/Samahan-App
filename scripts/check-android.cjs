const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { verifyAndroidNative } = require("./verify-android-native.cjs");

const root = path.resolve(__dirname, "..");
let temporary;
function run(label, script, args, cwd = root) {
  console.log(`\n${label}`);
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${label} failed (exit ${result.status}). Stop before building the APK.`);
}

try {
  const expo = require.resolve("expo/bin/cli");
  run("1/5 App regression tests", path.join(root, "scripts/run-tests.cjs"), []);
  run("2/5 Expo dependency compatibility", expo, ["install", "--check"]);

  // Generate native files in a throwaway copy. Existing android/ios folders,
  // credentials, Git state and the user's working files are never overwritten.
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), "samahan-android-check-"));
  const excluded = new Set([
    "node_modules",
    ".git",
    ".expo",
    "android",
    "ios",
    "dist",
    "web-build",
    ".diagnostics",
  ]);
  fs.cpSync(root, temporary, {
    recursive: true,
    filter: (source) => !excluded.has(path.relative(root, source).split(path.sep)[0]),
  });
  fs.symlinkSync(
    path.join(root, "node_modules"),
    path.join(temporary, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  run(
    "3/5 Generate Android project in a temporary folder",
    expo,
    ["prebuild", "--platform", "android", "--no-install"],
    temporary,
  );
  console.log("\n4/5 Verify the generated native startup fix");
  verifyAndroidNative(temporary);
  run(
    "5/5 Compile the production Android JavaScript bundle",
    expo,
    ["export", "--platform", "android", "--output-dir", path.join(temporary, "bundle")],
    temporary,
  );
  console.log(
    "\nPASS: Android preflight complete. This checks source/bundling/native configuration; install and cold-start the rebuilt APK to confirm the device crash is resolved.",
  );
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
} finally {
  if (temporary) {
    // Remove the link first so cleanup cannot descend into real node_modules.
    const modules = path.join(temporary, "node_modules");
    try {
      fs.unlinkSync(modules);
    } catch (error) {
      if (error.code !== "ENOENT")
        console.warn(`Temporary dependency link cleanup: ${error.message}`);
    }
    try {
      fs.rmSync(temporary, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Temporary check folder cleanup: ${error.message}`);
    }
  }
}
