import Constants, { ExecutionEnvironment } from "expo-constants";
import { Alert, Platform } from "react-native";
import { finishGoogleSignIn } from "./account";

let googleConfigured = false;

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

export async function signInWithGoogle() {
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

  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error("Google sign-in did not finish.");
  }

  return finishGoogleSignIn(
    response.data.idToken,
    response.data.user,
  );
}