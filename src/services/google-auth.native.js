import Constants, { ExecutionEnvironment } from "expo-constants";
import { Alert, Platform } from "react-native";
import { finishGoogleSignIn } from "./account";

let googleConfigured = false;
let pendingSignIn = null;

export function canSignInWithGoogle() {
  if (Platform.OS === "ios") {
    Alert.alert(
      "Google Sign In",
      "Google sign-in is currently unavailable on iPhone. Please use email and password to sign in.",
    );

    return false;
  }

  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    Alert.alert(
      "Google Sign In",
      "Google sign-in is unavailable in Expo Go. Please use the Android build or sign in with email and password.",
    );

    return false;
  }

  return true;
}

async function performGoogleSignIn() {
  if (!canSignInWithGoogle()) return null;

  const {
    GoogleOneTapSignIn,
    isCancelledResponse,
    isSuccessResponse,
  } = require("react-native-nitro-google-signin");

  if (!googleConfigured) {
    await GoogleOneTapSignIn.configure({
      webClientId: "autoDetect",
    });

    googleConfigured = true;
  }

  await GoogleOneTapSignIn.checkPlayServices();

  const response = await GoogleOneTapSignIn.presentExplicitSignIn();

  if (isCancelledResponse(response)) return null;

  if (!isSuccessResponse(response) || !response.data?.idToken) {
    throw Object.assign(new Error("Google sign-in did not return an ID token."), { code: "google/missing-token" });
  }

  return finishGoogleSignIn(
    response.data.idToken,
    response.data.user,
  );
}

export function signInWithGoogle() {
  if (pendingSignIn) return pendingSignIn;
  pendingSignIn = performGoogleSignIn().finally(() => { pendingSignIn = null; });
  return pendingSignIn;
}
