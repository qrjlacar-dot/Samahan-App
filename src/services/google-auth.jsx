import { GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

let googleConfigured = false;

export async function signInWithGoogle() {
    const {
    GoogleOneTapSignIn,
    isCancelledResponse,
    isNoSavedCredentialFoundResponse,
    isSuccessResponse,
    } = require("react-native-nitro-google-signin");

  if (!googleConfigured) {
    GoogleOneTapSignIn.configure({ webClientId: "autoDetect" });
    googleConfigured = true;
  }

  await GoogleOneTapSignIn.checkPlayServices();

    const response = await GoogleOneTapSignIn.presentExplicitSignIn();

  if (isCancelledResponse(response)) {
    return null;
  }

  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error("Google sign-in did not finish.");
  }

  const credential = GoogleAuthProvider.credential(response.data.idToken);
  const { user } = await signInWithCredential(auth, credential);

  try {
    const userRef = doc(db, "users", user.uid);
    const existingProfile = await getDoc(userRef);

    if (!existingProfile.exists()) {
      await setDoc(userRef, {
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        phone: "",
      });
    }
  } catch (error) {
    await signOut(auth).catch(() => {});
    throw error;
  }

  return user;
}