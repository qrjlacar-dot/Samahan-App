const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

const START = "// @generated begin samahan-android-startup-fix";
const END = "// @generated end samahan-android-startup-fix";
const RELEASE_SETTINGS = `${START}
// The affected release APK failed in WorkManager/Room before React Native started.
// Keep native shrinking off until a minified APK has been tested on a device.
android {
    buildTypes {
        release {
            minifyEnabled false
            shrinkResources false
        }
    }
}
${END}`;

module.exports = function withAndroidStartupFix(config) {
  config = withGradleProperties(config, (mod) => {
    const values = {
      "android.enableMinifyInReleaseBuilds": "false",
      "android.enableShrinkResourcesInReleaseBuilds": "false",
    };
    mod.modResults = mod.modResults.filter(
      (item) => item.type !== "property" || !(item.key in values),
    );
    for (const [key, value] of Object.entries(values)) {
      mod.modResults.push({ type: "property", key, value });
    }
    return mod;
  });

  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== "groovy") {
      throw new Error("SAMAHAN's Android startup fix requires the Expo Groovy template.");
    }
    // Replace our own block on repeated prebuilds, preserving all other Gradle code.
    const existing = mod.modResults.contents;
    const start = existing.indexOf(START);
    const end = existing.indexOf(END);
    if (start < 0 !== end < 0 || (start >= 0 && end < start)) {
      throw new Error(
        "Incomplete SAMAHAN Android startup block. Restore the generated native project.",
      );
    }
    const withoutBlock =
      start < 0 ? existing : existing.slice(0, start) + existing.slice(end + END.length);
    mod.modResults.contents = `${withoutBlock.trimEnd()}\n\n${RELEASE_SETTINGS}\n`;
    return mod;
  });
};
