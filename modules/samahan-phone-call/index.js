// Loaded only when a personal-contact call is requested on Android.
export function getPhoneCallModule() {
  try {
    return require("expo-modules-core").requireNativeModule("SamahanPhoneCall");
  } catch {
    return null;
  }
}
