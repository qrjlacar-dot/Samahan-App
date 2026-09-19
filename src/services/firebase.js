import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCK0oD7eThkMP2OS2J6V7I6OtPPQvzcRxQ",
  authDomain: "samahan-504f1.firebaseapp.com",
  projectId: "samahan-504f1",
  storageBucket: "samahan-504f1.firebasestorage.app",
  messagingSenderId: "795425333694",
  appId: "1:795425333694:web:f3da0310ae0abcb2e199ef",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);