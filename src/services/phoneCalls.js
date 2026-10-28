import {
  Alert,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
} from "react-native";
import { getPhoneCallModule } from "../../modules/samahan-phone-call/index";

let calling = false;
let lastCallStartedAt = -Infinity;

export function normalizedCallNumber(value) {
  return typeof value === "string" ? value.replace(/[\s()-]/g, "") : "";
}

// Only the actual Call button invokes this service. There are no automatic
// retries or calls from permissions, notifications, GPS, or app lifecycle events.
export async function callPhoneNumber(value, { emergency = false } = {}) {
  if (calling || Date.now() - lastCallStartedAt < 2000) return false;
  const number = normalizedCallNumber(value);
  const hotline = number === "911" || number === "122";
  if (!(hotline || /^(09\d{9}|\+639\d{9})$/.test(number))) {
    Alert.alert(
      "Unable to call",
      "Check the saved phone number and try again.",
    );
    return false;
  }
  calling = true;
  try {
    if (Platform.OS !== "android" || emergency || hotline) {
      await Linking.openURL(`tel:${number}`);
      lastCallStartedAt = Date.now();
      return true;
    }
    const native = getPhoneCallModule();
    if (!native?.call) {
      Alert.alert(
        "Updated app build required",
        "Install the new SAMAHAN APK to enable direct calls to your personal contacts.",
      );
      return false;
    }
    const permission = PermissionsAndroid.PERMISSIONS.CALL_PHONE;
    let granted = await PermissionsAndroid.check(permission);
    if (!granted) {
      const answer = await PermissionsAndroid.request(permission, {
        title: "Allow phone calls?",
        message:
          "SAMAHAN uses this permission only when you tap Call for a saved personal contact.",
        buttonPositive: "Continue",
        buttonNegative: "Not now",
      });
      granted = answer === PermissionsAndroid.RESULTS.GRANTED;
      if (!granted) {
        Alert.alert(
          "Phone calls are blocked",
          "Allow phone calls for SAMAHAN in your phone settings to call personal contacts directly.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Open settings",
              onPress: () => {
                void Linking.openSettings().catch(() => {});
              },
            },
          ],
        );
        return false;
      }
    }
    if (AppState?.currentState && AppState.currentState !== "active")
      return false;
    await native.call(number);
    lastCallStartedAt = Date.now();
    return true;
  } catch {
    Alert.alert(
      "Unable to call",
      "Your device could not start the call. Check the number, phone permission, and mobile service.",
    );
    return false;
  } finally {
    calling = false;
  }
}
