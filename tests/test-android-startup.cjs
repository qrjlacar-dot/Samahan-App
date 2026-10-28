const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { verifyAndroidNative } = require("../scripts/verify-android-native.cjs");
const pluginFile = path.resolve(__dirname, "../plugins/withAndroidStartupFix.cjs");

function applyPlugin({
  properties = [],
  gradle = "// Other native configuration\n",
  language = "groovy",
} = {}) {
  const callbacks = {};
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(pluginFile, "utf8"), {
    module,
    require(name) {
      assert.equal(name, "expo/config-plugins");
      return {
        withGradleProperties: (config, callback) => {
          callbacks.properties = callback;
          return config;
        },
        withAppBuildGradle: (config, callback) => {
          callbacks.gradle = callback;
          return config;
        },
      };
    },
  });
  module.exports({});
  return {
    properties: callbacks.properties({ modResults: properties }).modResults,
    gradle: callbacks.gradle({ modResults: { contents: gradle, language } }).modResults.contents,
  };
}

function nativeFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "samahan-native-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, value) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
  };
  const generated = applyPlugin();
  write(
    "android/gradle.properties",
    generated.properties.map(({ key, value }) => `${key}=${value}`).join("\n"),
  );
  write("android/app/build.gradle", generated.gradle);
  write(
    "android/app/src/main/AndroidManifest.xml",
    '<manifest><uses-permission android:name="android.permission.CALL_PHONE"/><uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/></manifest>',
  );
  write(
    "node_modules/expo-notifications/android/src/main/AndroidManifest.xml",
    '<manifest><uses-permission android:name="android.permission.POST_NOTIFICATIONS"/></manifest>',
  );
  write("android/app/google-services.json", '{"package_name":"com.samahan.app"}');
  return { root, write, generated };
}

test("startup plugin replaces duplicated defaults, preserves other config and is idempotent", () => {
  const once = applyPlugin({
    properties: [
      { type: "property", key: "custom.setting", value: "keep" },
      { type: "property", key: "android.enableMinifyInReleaseBuilds", value: "true" },
      { type: "property", key: "android.enableMinifyInReleaseBuilds", value: "true" },
    ],
  });
  const twice = applyPlugin(once);
  assert.equal(JSON.stringify(twice), JSON.stringify(once));
  assert.match(twice.gradle, /Other native configuration/);
  assert.equal(twice.properties.find((item) => item.key === "custom.setting").value, "keep");
});

test("startup plugin refuses unsupported or incomplete native edits", () => {
  assert.throws(() => applyPlugin({ language: "kotlin" }), /Groovy/);
  assert.throws(
    () => applyPlugin({ gradle: "// @generated begin samahan-android-startup-fix" }),
    /Incomplete/,
  );
});

test("native verifier accepts library-merged notification permission and rejects R8 regression", (t) => {
  const { root, write } = nativeFixture(t);
  assert.doesNotThrow(() => verifyAndroidNative(root));
  write(
    "android/gradle.properties",
    "android.enableMinifyInReleaseBuilds=true\nandroid.enableShrinkResourcesInReleaseBuilds=false\n",
  );
  assert.throws(() => verifyAndroidNative(root), /must be false/);
});

test("native verifier refuses a missing startup override or later Gradle override", (t) => {
  const { root, write, generated } = nativeFixture(t);
  write("android/app/build.gradle", "// stale generated project");
  assert.throws(() => verifyAndroidNative(root), /exactly once/);
  write(
    "android/app/build.gradle",
    generated.gradle + "\nandroid.buildTypes.release.minifyEnabled = true\n",
  );
  assert.throws(() => verifyAndroidNative(root), /final Gradle configuration/);
});
