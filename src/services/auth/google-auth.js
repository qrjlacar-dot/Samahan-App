import { Alert } from "react-native";

export function canSignInWithGoogle() {
  Alert.alert("Google Sign In", "Google sign-in is currently available in the Android build.");
  return false;
}

export async function signInWithGoogle() {
  canSignInWithGoogle();
  return null;
}
