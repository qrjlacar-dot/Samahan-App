const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function verifyAndroidNative(projectRoot) {
  const read = (relative) => fs.readFileSync(path.join(projectRoot, relative), "utf8");
  const properties = read("android/gradle.properties");
  for (const key of [
    "android.enableMinifyInReleaseBuilds",
    "android.enableShrinkResourcesInReleaseBuilds",
  ]) {
    const values = properties.split(/\r?\n/).filter((line) => line.startsWith(`${key}=`));
    assert.deepEqual(values, [`${key}=false`], `${key} must be false exactly once`);
  }
  const gradle = read("android/app/build.gradle");
  const start = "// @generated begin samahan-android-startup-fix";
  const end = "// @generated end samahan-android-startup-fix";
  assert.equal(gradle.split(start).length - 1, 1, "Startup fix must be generated exactly once");
  const block = gradle.slice(gradle.indexOf(start), gradle.indexOf(end));
  assert.match(block, /release\s*\{\s*minifyEnabled false\s*shrinkResources false\s*\}/);
  assert.equal(
    gradle.slice(gradle.indexOf(end) + end.length).trim(),
    "",
    "Startup settings must be the final Gradle configuration",
  );
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android\.permission\.CALL_PHONE/);
  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);
  // Library permissions are merged by Gradle, after Expo prebuild.
  const notificationManifest = read(
    "node_modules/expo-notifications/android/src/main/AndroidManifest.xml",
  );
  assert.match(manifest + notificationManifest, /android\.permission\.POST_NOTIFICATIONS/);
  // Do not mask a failed initializer by removing it or disabling trip notifications.
  assert.doesNotMatch(manifest, /androidx\.work\.WorkManagerInitializer[^>]*tools:node="remove"/);
  assert.match(read("android/app/google-services.json"), /com\.samahan\.app/);
  console.log(
    "PASS: generated Android release disables R8/resource shrinking and retains app permissions/Firebase.",
  );
}

module.exports = { verifyAndroidNative };

if (require.main === module) {
  if (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== "android") {
    console.log("Android startup verification skipped for this platform.");
  } else {
    try {
      verifyAndroidNative(path.resolve(__dirname, ".."));
    } catch (error) {
      console.error(`Android startup verification failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
