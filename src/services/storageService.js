import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { KEY, defState } from "../constants/config.js";
import { ym } from "../utils/currency.js";

const DEFAULT_API_KEY = "AIzaSyDHtHRf3T_PaiFEkHyfm8Fr3tuhVvNNRRQ";
const DEFAULT_PROJECT_ID = "expenses-app-e41a3";
const AUTH_STORAGE_KEY = "where-it-goes-auth-session";
const LOCAL_USERS_KEY = "where-it-goes-local-users";

// Default preconfigured master accounts
const DEFAULT_MASTER_USERS = {
  rakshith: { username: "rakshith", password: "123" },
  test: { username: "test", password: "123" }
};

export function getTestSeedState() {
  const currentMonth = ym(new Date());
  return {
    cur: "INR",
    accounts: [
      {
        id: "icici-sal",
        name: "ICICI Salary A/c",
        type: "bank",
        open: 85000
      },
      {
        id: "sbi-daily",
        name: "SBI Daily Use",
        type: "bank",
        open: 0
      },
      {
        id: "hdfc-savings",
        name: "HDFC Savings",
        type: "bank",
        open: 15000
      },
      {
        id: "cash",
        name: "Cash in Wallet",
        type: "bank",
        open: 3500
      },
      {
        id: "rupay-card",
        name: "Tata Neu RuPay Card",
        type: "card",
        cardType: "rupay",
        limit: 150000,
        billDay: 12,
        dueDay: 2,
        billedAmt: 8450,
        open: 0
      },
      {
        id: "visa-card",
        name: "HDFC Millennia Visa",
        type: "card",
        cardType: "visa",
        limit: 200000,
        billDay: 20,
        dueDay: 10,
        billedAmt: 14200,
        open: 0
      }
    ],
    txs: [
      {
        id: "seed-sal",
        type: "income",
        amount: 85000,
        acct: "icici-sal",
        note: "Monthly Salary",
        date: `${currentMonth}-01`,
        repeat: true
      },
      {
        id: "seed-tr-sbi",
        type: "transfer",
        amount: 30000,
        acct: "icici-sal",
        to: "sbi-daily",
        note: "Monthly expense budget to SBI UPI",
        date: `${currentMonth}-01`
      },
      {
        id: "seed-tr-hdfc",
        type: "transfer",
        amount: 20000,
        acct: "icici-sal",
        to: "hdfc-savings",
        note: "Savings transfer to HDFC",
        date: `${currentMonth}-01`
      },
      {
        id: "seed-hold-rahul",
        type: "people",
        kind: "hold",
        amount: 15000,
        person: "Rahul",
        acct: "hdfc-savings",
        note: "Rahul's savings kept with me",
        date: `${currentMonth}-02`
      },
      {
        id: "seed-lend-suresh",
        type: "people",
        kind: "lend",
        amount: 8000,
        person: "Suresh",
        acct: "hdfc-savings",
        note: "Emergency loan to Suresh",
        date: `${currentMonth}-03`
      },
      {
        id: "seed-rupay-1",
        type: "expense",
        amount: 8450,
        acct: "rupay-card",
        cat: "groc",
        note: "D-Mart & Supermarket UPI via RuPay",
        date: `${currentMonth}-04`
      },
      {
        id: "seed-rupay-2",
        type: "expense",
        amount: 250,
        acct: "rupay-card",
        cat: "food",
        note: "Coffee & snacks QR UPI",
        date: `${currentMonth}-06`
      },
      {
        id: "seed-rupay-3",
        type: "expense",
        amount: 2200,
        acct: "rupay-card",
        cat: "move",
        note: "Petrol bunk QR UPI",
        date: `${currentMonth}-07`
      },
      {
        id: "seed-visa-1",
        type: "expense",
        amount: 14200,
        acct: "visa-card",
        cat: "shop",
        note: "Amazon Great Indian Festival",
        date: `${currentMonth}-03`
      },
      {
        id: "seed-visa-2",
        type: "expense",
        amount: 1800,
        acct: "visa-card",
        cat: "bills",
        note: "Electricity & Wifi recharge",
        date: `${currentMonth}-05`
      },
      {
        id: "seed-sbi-exp1",
        type: "expense",
        amount: 650,
        acct: "sbi-daily",
        cat: "food",
        note: "Swiggy dinner",
        date: `${currentMonth}-05`
      },
      {
        id: "seed-pay-rupay",
        type: "transfer",
        amount: 4000,
        acct: "sbi-daily",
        to: "rupay-card",
        note: "Partial RuPay card bill payment",
        date: `${currentMonth}-08`
      }
    ],
    updatedAt: Date.now()
  };
}

let dbInstance = null;
let unsubscribeSnapshot = null;

function getActiveConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;
  return {
    apiKey: apiKey.trim(),
    authDomain: `${projectId.trim()}.firebaseapp.com`,
    projectId: projectId.trim()
  };
}

function getFirestoreDB() {
  if (!dbInstance) {
    const existingApps = getApps();
    const app = existingApps.length ? existingApps[0] : initializeApp(getActiveConfig());
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

export function getLocalUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    const users = raw ? JSON.parse(raw) : {};
    if (!users["rakshith"]) {
      users["rakshith"] = {
        username: "rakshith",
        password: "123",
        createdAt: 1700000000000
      };
    }
    if (!users["test"]) {
      users["test"] = {
        username: "test",
        password: "123",
        createdAt: 1700000000000
      };
    }
    return users;
  } catch (e) {
    return {
      rakshith: { username: "rakshith", password: "123", createdAt: 1700000000000 },
      test: { username: "test", password: "123", createdAt: 1700000000000 }
    };
  }
}

export function saveLocalUser(cleanUser, password) {
  try {
    const users = getLocalUsers();
    users[cleanUser.toLowerCase()] = {
      username: cleanUser,
      password: password,
      createdAt: Date.now()
    };
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {}
}

export function getUserStorageKey(userKey) {
  return userKey ? `${KEY}_${userKey}` : KEY;
}

export function getStoredUser() {
  try {
    const r = localStorage.getItem(AUTH_STORAGE_KEY);
    return r ? JSON.parse(r) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(userObj) {
  if (userObj) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userObj));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export async function loginWithUsername(username, password) {
  const cleanUser = (username || "").trim();
  const userKey = cleanUser.toLowerCase();

  if (!cleanUser || !password) {
    throw new Error("Please enter both username and password.");
  }

  // 1. Instant check for master accounts: rakshith / 123, test / 123
  if ((userKey === "rakshith" || userKey === "test") && password === "123") {
    const session = {
      username: userKey,
      key: userKey
    };
    setStoredUser(session);
    saveLocalUser(userKey, "123");

    // Attempt background Firestore registration/sync if permissions allow
    try {
      const db = getFirestoreDB();
      const userDocRef = doc(db, "users", userKey);
      setDoc(userDocRef, { username: userKey, password: "123", lastLogin: Date.now() }, { merge: true }).catch(() => {});
    } catch (e) {}

    return session;
  }

  // 2. Check local users registry
  const localUsers = getLocalUsers();
  const localRecord = localUsers[userKey];

  // 3. Try checking Firestore
  let cloudRecord = null;
  try {
    const db = getFirestoreDB();
    const userDocRef = doc(db, "users", userKey);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      cloudRecord = snap.data();
    }
  } catch (err) {
    console.warn("Firestore lookup unavailable, falling back to local auth:", err?.message);
  }

  const userRecord = cloudRecord || localRecord;

  if (!userRecord) {
    throw new Error(`Username "${cleanUser}" does not exist. Tap "Create new account" to register or use default (rakshith / 123).`);
  }

  if (userRecord.password !== password) {
    throw new Error("Incorrect password. Please try again.");
  }

  const session = {
    username: userRecord.username || cleanUser,
    key: userKey
  };

  setStoredUser(session);
  return session;
}

export async function registerWithUsername(username, password) {
  const cleanUser = (username || "").trim();
  const userKey = cleanUser.toLowerCase();

  if (!cleanUser) {
    throw new Error("Please choose a username.");
  }
  if (cleanUser.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }
  if (!password || password.length < 3) {
    throw new Error("Password must be at least 3 characters.");
  }

  // If user is registering rakshith with 123, allow it directly
  if (userKey === "rakshith" && password === "123") {
    return loginWithUsername("rakshith", "123");
  }

  // Check if taken locally
  const localUsers = getLocalUsers();
  if (localUsers[userKey] && userKey !== "rakshith") {
    // If it exists locally and password matches, just log them in
    if (localUsers[userKey].password === password) {
      return loginWithUsername(username, password);
    }
    throw new Error(`Username "${cleanUser}" is already taken. Please choose another.`);
  }

  // Try checking cloud Firestore (if permissions allow)
  try {
    const db = getFirestoreDB();
    const userDocRef = doc(db, "users", userKey);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      throw new Error(`Username "${cleanUser}" is already taken. Please choose another.`);
    }
  } catch (err) {
    console.warn("Firestore registration check skipped (using local):", err?.message);
  }

  const newUserRecord = {
    username: cleanUser,
    password: password,
    createdAt: Date.now()
  };

  // Always save locally so registration NEVER fails due to cloud permissions
  saveLocalUser(cleanUser, password);

  // Attempt cloud sync in background
  try {
    const db = getFirestoreDB();
    const userDocRef = doc(db, "users", userKey);
    await setDoc(userDocRef, newUserRecord);
  } catch (err) {
    console.warn("Could not sync user registration to Firestore (using local):", err?.message);
  }

  // If local browser already has legacy data, migrate it into their new user ledger
  const storageKey = getUserStorageKey(userKey);
  try {
    const legacy = JSON.parse(localStorage.getItem(KEY));
    if (legacy && Array.isArray(legacy.accounts) && Array.isArray(legacy.txs) && legacy.txs.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(legacy));
      try {
        const db = getFirestoreDB();
        const ledgerDocRef = doc(db, "ledgers", userKey);
        await setDoc(ledgerDocRef, legacy, { merge: true });
      } catch (e) {}
    }
  } catch (e) {}

  const session = {
    username: cleanUser,
    key: userKey
  };

  setStoredUser(session);
  return session;
}

export function logoutUser() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  setStoredUser(null);
}

export function startRealtimeSync(userKey, onRemoteData, onStatusChange) {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  if (!userKey) {
    onStatusChange({ connected: false, message: "Offline / Local Mode" });
    return () => {};
  }

  try {
    const db = getFirestoreDB();
    onStatusChange({ connected: false, message: "Connecting to user ledger..." });

    // Each user's data is stored in its own dedicated document: ledgers/{userKey}
    const docRef = doc(db, "ledgers", userKey);
    const storageKey = getUserStorageKey(userKey);

    unsubscribeSnapshot = onSnapshot(
      docRef,
      (snapshot) => {
        onStatusChange({ connected: true, message: "Secure Cloud Sync Active" });
        if (snapshot.exists()) {
          const cloudData = snapshot.data();
          if (cloudData && Array.isArray(cloudData.accounts) && Array.isArray(cloudData.txs)) {
            const local = loadState(userKey);
            if ((cloudData.updatedAt || 0) > (local.updatedAt || 0) || local.txs.length === 0) {
              const merged = Object.assign(defState(), cloudData);
              localStorage.setItem(storageKey, JSON.stringify(merged));
              onRemoteData(merged);
            }
          }
        } else {
          // If no cloud ledger exists yet for this user, seed it from their local state
          const local = loadState(userKey);
          if (local.txs.length > 0 || local.accounts.length > 1) {
            saveState(local, userKey);
          }
        }
      },
      (err) => {
        console.error("Firestore Sync Error:", err);
        onStatusChange({ connected: false, error: true, message: "Cloud sync error (using local)" });
      }
    );

    return () => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  } catch (err) {
    onStatusChange({ connected: false, error: true, message: "Cloud init failed" });
    return () => {};
  }
}

export function loadState(userKey = null) {
  const storageKey = getUserStorageKey(userKey);
  try {
    const r = JSON.parse(localStorage.getItem(storageKey));
    if (r && Array.isArray(r.accounts) && Array.isArray(r.txs)) {
      return Object.assign(defState(), r);
    }
  } catch (e) {}

  // If test user has no data yet, seed with rich realistic topology
  if (userKey === "test") {
    const seed = getTestSeedState();
    try {
      localStorage.setItem(storageKey, JSON.stringify(seed));
    } catch (e) {}
    return seed;
  }

  // If this user has no local record yet, check if there's unauthenticated legacy data to migrate
  if (userKey) {
    try {
      const legacy = JSON.parse(localStorage.getItem(KEY));
      if (legacy && Array.isArray(legacy.accounts) && Array.isArray(legacy.txs) && legacy.txs.length > 0) {
        const migrated = Object.assign(defState(), legacy);
        localStorage.setItem(storageKey, JSON.stringify(migrated));
        return migrated;
      }
    } catch (e) {}
  }

  // Fallback migration from ancient v1 format if present
  const s = defState();
  try {
    const o = JSON.parse(localStorage.getItem("where-it-goes-v1"));
    if (o) {
      (o.incomes || []).forEach((i) =>
        s.txs.push({
          id: i.id, type: "income", amount: i.amount, acct: "cash",
          note: i.name, date: i.from + "-01", repeat: i.type !== "once", until: i.until || ""
        })
      );
      (o.expenses || []).forEach((e) =>
        s.txs.push({
          id: e.id, type: "expense", amount: e.amount, acct: "cash",
          cat: e.cat, note: e.note || "", date: e.date, repeat: !!e.repeat
        })
      );
      s.cur = o.cur || "INR";
    }
  } catch (e) {}
  return s;
}

export async function saveState(state, userKey = null) {
  const stamped = { ...state, updatedAt: Date.now() };
  const storageKey = getUserStorageKey(userKey);

  try {
    localStorage.setItem(storageKey, JSON.stringify(stamped));
  } catch (e) {}

  if (userKey) {
    try {
      const db = getFirestoreDB();
      const docRef = doc(db, "ledgers", userKey);
      await setDoc(docRef, stamped, { merge: true });
    } catch (e) {
      console.error("Failed to push to user cloud ledger:", e);
    }
  }
  return stamped;
}
