import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithCredential,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

let currentGoogleProfile = null;

export const isGoogleAccount = (user) =>
  !!user?.providerData?.some(
    (provider) => provider.providerId === "google.com",
  );

export function getAccountIdentity(user, profile) {
  const google = user?.providerData?.find(
    (provider) => provider.providerId === "google.com",
  );

  const latestGoogle =
    currentGoogleProfile?.uid === user?.uid
      ? currentGoogleProfile
      : null;

  const name = google
    ? latestGoogle?.name ||
      google.displayName ||
      user.displayName ||
      "Name"
    : profile?.name ||
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "Name";

  return {
    name,
    email: google?.email || user?.email || "",
    photoURL: google
      ? latestGoogle?.photoURL ||
        profile?.googlePhotoURL ||
        google.photoURL ||
        user.photoURL ||
        ""
      : "",
    initial: Array.from(name.trim())[0]?.toLocaleUpperCase() || "?",
  };
}

export function accountErrorMessage(error) {
  const messages = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/wrong-password": "Current password is incorrect.",
    "auth/user-not-found": "The email or password is incorrect.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use":
      "This email already has an account. Please log in.",
    "auth/weak-password": "Use at least 6 characters for your password.",
    "auth/requires-recent-login":
      "Please sign in again before changing your account.",
    "auth/network-request-failed":
      "Check your internet connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/user-disabled": "This account has been disabled.",
    "permission-denied":
      "Your profile could not be saved. Please check the Firebase permissions.",
  };

  return messages[error?.code] || "Something went wrong. Please try again.";
}

async function ensureProfile(user, googlePhotoURL = "") {
  const ref = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  const data = snapshot.exists() ? snapshot.data() : {};
  const identity = getAccountIdentity(user, data);

  await setDoc(
    ref,
    {
      name: identity.name,
      email: user.email || "",
      photoURL: googlePhotoURL || identity.photoURL,
      ...(isGoogleAccount(user) && {
        googlePhotoURL: googlePhotoURL || identity.photoURL,
      }),
      phone: data.phone || "",
    },
    { merge: true },
  );
}

export async function loginWithEmail(email, password) {
  const { user } = await signInWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password,
  );

  try {
    await ensureProfile(user);
  } catch {
    console.warn("Signed in, but the account profile could not be synced.");
  }

  return user;
}

export async function registerWithEmail(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(
    auth,
    email.trim().toLowerCase(),
    password,
  );

  try {
    await updateProfile(user, {
      displayName: name.trim(),
      photoURL: null,
    });

    await ensureProfile(user);
  } catch {
    await signOut(auth).catch(() => {});

    const registrationError = new Error(
      "Your account was created, but its profile could not be saved. Please log in with this email instead of signing up again.",
    );

    registrationError.code = "account/profile-incomplete";
    throw registrationError;
  }

  return user;
}

function requirePasswordAccount() {
  const user = auth.currentUser;

  if (!user || isGoogleAccount(user)) {
    throw new Error("This account cannot be edited here.");
  }

  return user;
}

export async function saveAccountProfile(name, email, password) {
  const user = requirePasswordAccount();
  const newEmail = email.trim().toLowerCase();
  const emailChanged = newEmail !== user.email?.toLowerCase();

  if (emailChanged) {
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password),
    );

    await verifyBeforeUpdateEmail(user, newEmail);
  }

  await updateProfile(user, { displayName: name.trim() });

  await setDoc(
    doc(db, "users", user.uid),
    {
      name: name.trim(),
      email: user.email,
      photoURL: "",
    },
    { merge: true },
  );

  return emailChanged;
}

export async function changeAccountPassword(currentPassword, newPassword) {
  const user = requirePasswordAccount();

  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, currentPassword),
  );

  await updatePassword(user, newPassword);
}

export const sendResetLink = (email) =>
  sendPasswordResetEmail(auth, email.trim().toLowerCase());

export async function signOutAccount() {
  await signOut(auth);
  currentGoogleProfile = null;
}

export async function finishGoogleSignIn(idToken, googleProfile = {}) {
  const result = await signInWithCredential(
    auth,
    GoogleAuthProvider.credential(idToken),
  );

  const user = result.user;
  const details = getAdditionalUserInfo(result)?.profile || {};
  const provider = user.providerData.find(
    (item) => item.providerId === "google.com",
  );

  const name =
    googleProfile.name ||
    details.name ||
    provider?.displayName ||
    user.displayName ||
    "";

  const photoURL =
    googleProfile.photo ||
    details.picture ||
    provider?.photoURL ||
    user.photoURL ||
    "";

  currentGoogleProfile = {
    uid: user.uid,
    name,
    photoURL,
  };

  if (name !== user.displayName || (photoURL && photoURL !== user.photoURL)) {
    try {
      await updateProfile(user, {
        displayName: name,
        ...(photoURL && { photoURL }),
      });
    } catch {
      console.warn("Could not update the Google profile in Firebase Auth.");
    }
  }

  try {
    await user.getIdToken(true);
  } catch {
    console.warn("Could not refresh the Google account session.");
  }

  try {
    await ensureProfile(user, photoURL);
  } catch {
    console.warn(
      "Google profile is available in Auth, but could not be saved in Firestore.",
    );
  }

  return user;
}