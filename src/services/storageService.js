import { initializeApp, getApps } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";
import { KEY, defState } from "../constants/config";

// Hardcoded default Firebase configuration so end-users never have to configure anything!
const DEFAULT_API_KEY = "AIzaSyDHtHRf3T_PaiFEkHyfm8Fr3tuhVvNNRRQ";
const DEFAULT_PROJECT_ID = "expenses-app-e41a3";
const DEFAULT_SYNC_ID = "rakshith-master-ledger-v2";

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

export function startRealtimeSync(onRemoteData, onStatusChange) {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  const cfg = getActiveConfig();
  if (!cfg.apiKey || !cfg.projectId) {
    onStatusChange({ connected: false, message: "Offline-only (Local browser)" });
    return () => {};
  }

  try {
    const existingApps = getApps();
    const app = existingApps.length ? existingApps[0] : initializeApp(cfg);
    dbInstance = getFirestore(app);

    onStatusChange({ connected: false, message: "Connecting to live cloud..." });

    const docRef = doc(dbInstance, "ledgers", DEFAULT_SYNC_ID);
    unsubscribeSnapshot = onSnapshot(
      docRef,
      (snapshot) => {
        onStatusChange({ connected: true, message: "Live Cloud Sync Active" });
        if (snapshot.exists()) {
          const cloudData = snapshot.data();
          if (cloudData && Array.isArray(cloudData.accounts) && Array.isArray(cloudData.txs)) {
            const local = loadState();
            if ((cloudData.updatedAt || 0) > (local.updatedAt || 0) || local.txs.length === 0) {
              const merged = Object.assign(defState(), cloudData);
              localStorage.setItem(KEY, JSON.stringify(merged));
              onRemoteData(merged);
            }
          }
        } else {
          const local = loadState();
          if (local.txs.length > 0 || local.accounts.length > 1) {
            saveState(local);
          }
        }
      },
      (err) => {
        console.error("Firebase Sync Error:", err);
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

export function loadState() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY));
    if (r && Array.isArray(r.accounts) && Array.isArray(r.txs)) {
      return Object.assign(defState(), r);
    }
  } catch (e) {}

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

export async function saveState(state) {
  const stamped = { ...state, updatedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(stamped));
  } catch (e) {}

  if (dbInstance) {
    try {
      const docRef = doc(dbInstance, "ledgers", DEFAULT_SYNC_ID);
      await setDoc(docRef, stamped, { merge: true });
    } catch (e) {
      console.error("Failed to push to cloud:", e);
    }
  }
  return stamped;
}
