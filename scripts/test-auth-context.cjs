const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const createLoader = require("./helpers/source-loader.cjs");
const hookHarness = require("./helpers/hook-harness.cjs");
const settle = () => new Promise((resolve) => setImmediate(resolve));

function fixture() {
  const { react, runtime, render } = hookHarness();
  const auth = { currentUser: { uid: "a", displayName: "Jannah", email: "a@example.com", providerData: [] } };
  const listeners = [], writes = [];
  let tokenListener;
  let writeError;
  let resolveWrite;
  let deferred = false;
  const load = createLoader({
    react: { ...react, createContext: () => ({ Provider: "AuthProvider" }) },
    "react/jsx-runtime": runtime,
    "firebase/auth": { onIdTokenChanged: (_, callback) => { tokenListener = callback; callback(auth.currentUser); return () => {}; } },
    "firebase/firestore": {
      doc: (_, collection, uid) => ({ collection, uid }),
      getDoc: async () => ({ exists: () => false }),
      setDoc: async (ref, data) => {
        writes.push({ ref, data });
        if (deferred) await new Promise((resolve) => { resolveWrite = resolve; });
        if (writeError) throw writeError;
      },
      onSnapshot: (ref, next, error) => {
        const item = { ref, next, error, active: true }; listeners.push(item);
        return () => { item.active = false; };
      },
    },
    "../services/firebase": { auth, db: {} },
    "./firebase": { auth, db: {} },
  });
  const { AuthProvider } = load(path.resolve(__dirname, "../src/context/AuthContext.jsx"));
  const h = render(AuthProvider, { children: null });
  return {
    h, auth, listeners, writes,
    value: () => h.result.props.value,
    switchUser(user) { auth.currentUser = user; tokenListener(user); h.flush(); },
    failWrites(error) { writeError = error; },
    deferWrites() { deferred = true; },
    finishWrite() { resolveWrite(); },
  };
}

test("profile permission errors preserve login and retry recreates the terminated listener", async () => {
  const f = fixture();
  f.listeners[0].error({ code: "permission-denied" }); f.h.flush();
  assert.equal(f.value().user.uid, "a");
  assert.equal(f.value().identity.name, "Jannah");
  assert.match(f.value().profileError, /permissions/);
  await f.value().retryProfile(); f.h.flush();
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0].ref.uid, "a");
  assert.equal(f.listeners.length, 2); assert.equal(f.listeners[0].active, false);
  f.listeners[1].next({ exists: () => true, data: () => ({ name: "Saved Jannah" }) }); f.h.flush();
  assert.equal(f.value().identity.name, "Saved Jannah"); assert.equal(f.value().profileError, "");
  f.h.dispose();
});

test("failed profile retries stay visible without signing the user out", async () => {
  const f = fixture(); f.failWrites({ code: "permission-denied" });
  await f.value().retryProfile(); f.h.flush();
  assert.equal(f.value().user.uid, "a"); assert.match(f.value().profileError, /permissions/);
  assert.equal(f.value().profileSyncing, false); f.h.dispose();
});

test("rapid profile retries share one write and ignore a previous account's late result", async () => {
  const f = fixture(); f.deferWrites();
  const pending = f.value().retryProfile();
  await f.value().retryProfile(); await settle(); f.h.flush();
  assert.equal(f.writes.length, 1); assert.equal(f.value().profileSyncing, true);
  f.switchUser({ uid: "b", displayName: "Second account", email: "b@example.com", providerData: [] });
  const listenerCount = f.listeners.length;
  f.listeners[0].next({ exists: () => true, data: () => ({ name: "Wrong account" }) }); f.h.flush();
  assert.equal(f.value().identity.name, "Second account");
  f.finishWrite(); await pending; f.h.flush();
  assert.equal(f.listeners.length, listenerCount); assert.equal(f.value().profileError, "");
  assert.equal(f.value().profileSyncing, false); f.h.dispose();
});
