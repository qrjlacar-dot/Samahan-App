const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const { transformSync } = require("@babel/core");

function loadSource(file, mocks) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const { code } = transformSync(source, {
    configFile: false,
    babelrc: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const module = { exports: {} };
  vm.runInNewContext(
    code,
    {
      module,
      exports: module.exports,
      require(name) {
        if (!(name in mocks)) throw new Error(`Unexpected module: ${name}`);
        return mocks[name];
      },
    },
    { filename: file },
  );
  return module.exports;
}

function accountFixture(user, overrides = {}) {
  const calls = [];
  const auth = { currentUser: user };
  const authSDK = {
    createUserWithEmailAndPassword: async (...args) => {
      calls.push(["create", ...args]);
      return { user };
    },
    signInWithEmailAndPassword: async (...args) => {
      calls.push(["login", ...args]);
      return { user };
    },
    signInWithCredential: async (...args) => {
      calls.push(["google", ...args]);
      return { user };
    },
    updateProfile: async (account, profile) => {
      calls.push(["profile", profile]);
      Object.assign(account, profile);
    },
    EmailAuthProvider: {
      credential: (email, password) => ({ email, password }),
    },
    GoogleAuthProvider: { credential: (idToken) => ({ idToken }) },
    reauthenticateWithCredential: async (...args) => {
      calls.push(["reauth", ...args]);
    },
    getAdditionalUserInfo: () => ({ profile: {} }),
    verifyBeforeUpdateEmail: async (...args) => {
      calls.push(["verify", ...args]);
    },
    updatePassword: async (...args) => {
      calls.push(["password", ...args]);
    },
    sendPasswordResetEmail: async (...args) => {
      calls.push(["reset", ...args]);
    },
    signOut: async () => {
      calls.push(["signOut"]);
      auth.currentUser = null;
    },
    ...overrides.auth,
  };
  const firestore = {
    doc: (db, collection, uid) => ({ collection, uid }),
    getDoc: async () => ({ exists: () => false }),
    setDoc: async (...args) => {
      calls.push(["save", ...args]);
    },
    ...overrides.firestore,
  };
  const api = loadSource("src/services/account.js", {
    "firebase/auth": authSDK,
    "firebase/firestore": firestore,
    "./firebase": { auth, db: {} },
  });
  return { api, calls, auth };
}

const emailUser = () => ({
  uid: "email-user",
  email: "old@example.com",
  displayName: "Rhian",
  photoURL: "old-photo",
  providerData: [{ providerId: "password" }],
});
const googleUser = () => ({
  uid: "google-user",
  getIdToken: async () => "mock-refreshed-token",
  email: "google@example.com",
  displayName: "Auth name",
  photoURL: "auth-photo",
  providerData: [
    {
      providerId: "google.com",
      displayName: "Google name",
      email: "google@example.com",
      photoURL: "google-photo",
    },
  ],
});

test("email identity uses the saved name initial and ignores old uploaded photos", () => {
  const { api } = accountFixture(emailUser());
  const identity = api.getAccountIdentity(emailUser(), {
    name: "  rhian jannah",
    photoURL: "custom-photo",
  });
  assert.equal(identity.name, "  rhian jannah");
  assert.equal(identity.initial, "R");
  assert.equal(identity.photoURL, "");
});

test("Google identity comes from Google instead of editable Firestore values", () => {
  const { api } = accountFixture(googleUser());
  const identity = api.getAccountIdentity(googleUser(), {
    name: "Edited name",
    email: "edited@example.com",
    photoURL: "custom-photo",
  });
  assert.equal(identity.name, "Google name");
  assert.equal(identity.email, "google@example.com");
  assert.equal(identity.photoURL, "google-photo");
});

test("Google accounts cannot change names, emails, or passwords through account services", async () => {
  const { api, calls } = accountFixture(googleUser());
  await assert.rejects(
    api.saveAccountProfile("Changed", "changed@example.com", "password"),
  );
  await assert.rejects(api.changeAccountPassword("password", "new-password"));
  assert.equal(calls.length, 0);
});

test("email changes reauthenticate and send verification without treating a pending email as active", async () => {
  const user = emailUser();
  const { api, calls } = accountFixture(user);
  assert.equal(
    await api.saveAccountProfile("Jannah", " NEW@EXAMPLE.COM ", "secret"),
    true,
  );
  assert.equal(calls[0][0], "reauth");
  assert.equal(calls[0][2].email, "old@example.com");
  assert.equal(calls[1][0], "verify");
  assert.equal(calls[1][2], "new@example.com");
  assert.equal(
    calls.find(([operation]) => operation === "save")[2].email,
    "old@example.com",
  );
});

test("failed reauthentication does not mutate the profile", async () => {
  const error = Object.assign(new Error("wrong password"), {
    code: "auth/invalid-credential",
  });
  const { api, calls } = accountFixture(emailUser(), {
    auth: {
      reauthenticateWithCredential: async () => {
        throw error;
      },
    },
  });
  await assert.rejects(
    api.saveAccountProfile("New name", "new@example.com", "wrong"),
  );
  assert.equal(calls.length, 0);
});

test("changing only the name does not send verification or require a password", async () => {
  const { api, calls } = accountFixture(emailUser());
  assert.equal(
    await api.saveAccountProfile(" Jannah ", " OLD@example.com ", ""),
    false,
  );
  assert.equal(
    calls.some(
      ([operation]) => operation === "reauth" || operation === "verify",
    ),
    false,
  );
  assert.equal(
    calls.find(([operation]) => operation === "save")[2].name,
    "Jannah",
  );
});

test("password changes use the current password before updating", async () => {
  const { api, calls } = accountFixture(emailUser());
  await api.changeAccountPassword("current", "replacement");
  assert.equal(calls[0][0], "reauth");
  assert.equal(calls[0][2].password, "current");
  assert.equal(calls[1][0], "password");
  assert.equal(calls[1][2], "replacement");
});

test("registration saves the name in Auth and the users document", async () => {
  const user = emailUser();
  const { api, calls } = accountFixture(user);
  assert.equal(
    await api.registerWithEmail(" Jannah ", " NEW@EXAMPLE.COM ", "password"),
    user,
  );
  assert.equal(calls[0][0], "create");
  assert.equal(calls[0][2], "new@example.com");
  assert.equal(
    calls.find(([operation]) => operation === "profile")[1].displayName,
    "Jannah",
  );
  assert.equal(
    calls.find(([operation]) => operation === "save")[1].uid,
    user.uid,
  );
});

test("partial registration tells the caller the account already exists and signs it out", async () => {
  const { api, calls, auth } = accountFixture(emailUser(), {
    firestore: {
      setDoc: async () => {
        throw new Error("offline");
      },
    },
  });
  await assert.rejects(
    api.registerWithEmail("Jannah", "new@example.com", "password"),
    (error) => error.code === "account/profile-incomplete",
  );
  assert.equal(auth.currentUser, null);
  assert.equal(calls.at(-1)[0], "signOut");
});

test("valid email login still succeeds if Firestore is unavailable", async () => {
  const user = emailUser();
  const { api } = accountFixture(user, {
    firestore: {
      getDoc: async () => {
        throw new Error("offline");
      },
    },
  });
  assert.equal(await api.loginWithEmail("old@example.com", "password"), user);
});

test("Google sign-in exchanges the ID token for Firebase credentials", async () => {
  const user = googleUser();
  const { api, calls } = accountFixture(user);
  assert.equal(await api.finishGoogleSignIn("google-token"), user);
  assert.equal(calls[0][0], "google");
  assert.equal(calls[0][2].idToken, "google-token");
  assert.equal(
    calls.find(([operation]) => operation === "save")[2].photoURL,
    "google-photo",
  );
});

function googleFixture(platform, environment, response) {
  const calls = [];
  const api = loadSource("src/services/google-auth.native.js", {
    "expo-constants": {
      __esModule: true,
      default: { executionEnvironment: environment },
      ExecutionEnvironment: { StoreClient: "storeClient" },
    },
    "react-native": {
      Platform: { OS: platform },
      Alert: { alert: (...args) => calls.push(["alert", ...args]) },
    },
    "./account": {
      finishGoogleSignIn: async (token) => {
        calls.push(["firebase", token]);
        return { uid: "signed-in" };
      },
    },
    "react-native-nitro-google-signin": {
      GoogleOneTapSignIn: {
        configure: async () => {
          calls.push(["configure"]);
        },
        checkPlayServices: async () => {
          calls.push(["playServices"]);
        },
        presentExplicitSignIn: async () => {
          calls.push(["nativeSignIn"]);
          return response;
        },
      },
      isCancelledResponse: (value) => value.type === "cancelled",
      isSuccessResponse: (value) => value.type === "success",
    },
  });
  return { api, calls };
}

for (const [platform, environment] of [
  ["ios", "storeClient"],
  ["ios", "standalone"],
  ["android", "storeClient"],
]) {
  test(`${platform} ${environment} shows an alert and never calls native Google sign-in`, async () => {
    const { api, calls } = googleFixture(platform, environment);
    assert.equal(await api.signInWithGoogle(), null);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], "alert");
    if (platform === "ios") assert.match(calls[0][2], /unavailable on iPhone/);
  });
}

test("Google cancellation does not sign the user in", async () => {
  const { api, calls } = googleFixture("android", "standalone", {
    type: "cancelled",
  });
  assert.equal(await api.signInWithGoogle(), null);
  assert.equal(
    calls.some(([operation]) => operation === "firebase"),
    false,
  );
});

test("Android build configures Google once and uses the returned ID token", async () => {
  const { api, calls } = googleFixture("android", "standalone", {
    type: "success",
    data: { idToken: "token" },
  });
  assert.equal((await api.signInWithGoogle()).uid, "signed-in");
  await api.signInWithGoogle();
  assert.equal(
    calls.filter(([operation]) => operation === "configure").length,
    1,
  );
  assert.equal(
    calls.find(([operation]) => operation === "firebase")[1],
    "token",
  );
});

test("emergency contacts remain separate across accounts and survive reloading", async () => {
  const storage = new Map();
  const api = loadSource("src/services/emergencyContacts.js", {
    "@react-native-async-storage/async-storage": {
      __esModule: true,
      default: {
        getItem: async (key) => storage.get(key) ?? null,
        setItem: async (key, value) => storage.set(key, value),
      },
    },
  });
  await api.saveContacts(
    [{ id: "1", name: "Family", phone: "09123456789" }],
    "account-a",
  );
  assert.equal((await api.loadContacts("account-a"))[0].name, "Family");
  assert.equal((await api.loadContacts("account-b")).length, 0);
  assert.equal((await api.loadContacts("account-a"))[0].phone, "09123456789");
});
