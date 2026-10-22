import { onIdTokenChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getAccountIdentity, isGoogleAccount, profileErrorMessage, syncAccountProfile } from "../services/account";
import { auth, db } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, initializing: true });
  const { user, initializing } = session;
  const [profile, setProfile] = useState(null);
  const [failure, setFailure] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [syncingUid, setSyncingUid] = useState(null);
  const pending = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = onIdTokenChanged(auth, (nextUser) => {
      setSession({ user: nextUser, initializing: false });
      setProfile((previous) => previous?.uid === nextUser?.uid ? previous : null);
      setFailure((previous) => previous?.uid === nextUser?.uid ? previous : null);
    });
    return () => { mounted.current = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (!active) return;
      setProfile(snapshot.exists() ? { ...snapshot.data(), uid: user.uid } : null);
      setFailure(null);
    }, (error) => {
      if (active) setFailure({ uid: user.uid, message: profileErrorMessage(error) });
    });
    return () => { active = false; unsubscribe(); };
  }, [user?.uid, attempt]);

  const retryProfile = useCallback(async () => {
    const uid = user?.uid;
    if (!uid || pending.current === uid) return;
    pending.current = uid;
    setSyncingUid(uid);
    try {
      await syncAccountProfile();
      if (mounted.current && auth.currentUser?.uid === uid) {
        setFailure(null);
        setAttempt((value) => value + 1);
      }
    } catch (error) {
      if (mounted.current && auth.currentUser?.uid === uid) {
        setFailure({ uid, message: profileErrorMessage(error) });
      }
    } finally {
      if (pending.current === uid) pending.current = null;
      if (mounted.current) setSyncingUid((value) => value === uid ? null : value);
    }
  }, [user?.uid]);

  const identity = getAccountIdentity(user, profile?.uid === user?.uid ? profile : null);

  return (
    <AuthContext.Provider value={{
      user, initializing, identity, isGoogle: isGoogleAccount(user),
      profileError: failure?.uid === user?.uid ? failure?.message || "" : "",
      profileSyncing: !!user && syncingUid === user.uid,
      retryProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
