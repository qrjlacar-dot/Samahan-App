import { onIdTokenChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { getAccountIdentity, isGoogleAccount } from "../services/account";
import { auth, db } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    user: null,
    initializing: true,
  });

  const { user, initializing } = session;
  const [profile, setProfile] = useState(null);

  useEffect(
    () =>
      onIdTokenChanged(auth, (nextUser) => {
        setSession({
          user: nextUser,
          initializing: false,
        });

        setProfile((previous) =>
          previous?.uid === nextUser?.uid ? previous : null,
        );
      }),
    [],
  );

  useEffect(() => {
    if (!user) return;

    let active = true;

    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        if (!active) return;

        setProfile(
          snapshot.exists()
            ? { ...snapshot.data(), uid: user.uid }
            : null,
        );
      },
      () => {
        if (active) setProfile(null);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.uid]);

  const identity = getAccountIdentity(
    user,
    profile?.uid === user?.uid ? profile : null,
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        initializing,
        identity,
        isGoogle: isGoogleAccount(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}