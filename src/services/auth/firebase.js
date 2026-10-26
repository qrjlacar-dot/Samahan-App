import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyCK0oD7eThkMP2OS2J6V7I6OtPPQvzcRxQ",
  authDomain: "samahan-504f1.firebaseapp.com",
  projectId: "samahan-504f1",
  storageBucket: "samahan-504f1.firebasestorage.app",
  messagingSenderId: "795425333694",
  appId: "1:795425333694:web:f3da0310ae0abcb2e199ef",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth() {
  if (Platform.OS === "web") return getAuth(app);

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    if (error.code === "auth/already-initialized") return getAuth(app);
    throw error;
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
