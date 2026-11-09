import React, { useState, useEffect, useCallback } from "react";
import { ym, mname, shift } from "./utils/currency";
import {
  loadState,
  saveState,
  startRealtimeSync,
  getStoredUser,
  logoutUser
} from "./services/storageService";
import { HomeView, ActivityView, AccountsView, PeopleView, MoreView } from "./components/Views";
import SheetModal from "./components/SheetModal";
import AuthView from "./components/AuthView";

const TABS = [
  { k: "o", l: "Home", svg: <path d="M4 11l8-7 8 7v9H4z" /> },
  { k: "a", l: "Activity", svg: <path d="M5 7h14M5 12h14M5 17h9" /> },
  { k: "c", l: "Accounts", svg: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18" /></> },
  { k: "p", l: "People", svg: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 5a3 3 0 010 6M18 14c2 .6 3 2.5 3 6" /></> },
  { k: "m", l: "More", svg: <><path d="M4 8h10M18 8h2M4 16h2M10 16h10" /><circle cx="16" cy="8" r="2" /><circle cx="8" cy="16" r="2" /></> }
];

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [isGuest, setIsGuest] = useState(false);

  const [S, setS] = useState(() => {
    const session = getStoredUser();
    return loadState(session ? session.key : null);
  });

  const [M, setM] = useState(() => ym(new Date()));
  const [tab, setTab] = useState("o");
  const [filter, setFilter] = useState({ ft: "", fAcct: "", fcat: "" });
  const [modal, setModal] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ connected: false, message: "Connecting..." });

  const connectRealtime = useCallback(() => {
    if (!user) {
      setSyncStatus({ connected: false, message: isGuest ? "Offline Guest Mode" : "Local mode" });
      return () => {};
    }
    return startRealtimeSync(
      user.key,
      (remoteState) => setS(remoteState),
      (status) => setSyncStatus(status)
    );
  }, [user, isGuest]);

  useEffect(() => {
    const stopSync = connectRealtime();
    const onKey = (e) => {
      if (e.key === "Escape") setModal(null);
    };
    document.addEventListener("keydown", onKey);
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 180;
      const x = c.getContext("2d");
      x.fillStyle = "#17252A";
      x.fillRect(0, 0, 180, 180);
      [["#D9822B", 24, 60], ["#3F6C8F", 84, 40], ["#0B7A63", 124, 30]].forEach(([col, l, w]) => {
        x.fillStyle = col;
        x.fillRect(l, 60, w, 70);
      });
      const l = document.createElement("link");
      l.rel = "apple-touch-icon";
      l.href = c.toDataURL("image/png");
      document.head.appendChild(l);
    } catch (e) {}
    return () => {
      stopSync();
      document.removeEventListener("keydown", onKey);
    };
  }, [connectRealtime]);

  const updateState = async (next) => {
    setS(next);
    await saveState(next, user ? user.key : null);
  };

  const handleLoginSuccess = (session) => {
    setUser(session);
    setIsGuest(false);
    const loaded = loadState(session.key);
    setS(loaded);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setIsGuest(false);
    setS(loadState(null));
  };

  const handleAddNew = () => {
    if (tab === "c") setModal({ mode: "acct", id: "" });
    else setModal({ mode: "tx", id: "", pre: tab === "p" ? { type: "people" } : {} });
  };

  if (!user && !isGuest) {
    return (
      <AuthView
        onLoginSuccess={handleLoginSuccess}
        onGuest={() => setIsGuest(true)}
      />
    );
  }

  return (
    <>
      <header style={{
        maxWidth: "540px",
        margin: "0 auto",
        padding: "12px 16px 2px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #0F172A 0%, #059669 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "14px"
          }}>
            W
          </div>
          <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.02em", color: "var(--ink)" }}>
            Where It Goes
          </span>
        </div>

        {user && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--mute)",
            background: "var(--card)",
            border: "1px solid var(--line)",
            padding: "4px 10px",
            borderRadius: "16px",
            boxShadow: "var(--shadow-xs)"
          }}>
            <span style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: syncStatus.connected ? "var(--in)" : "var(--mute)",
              boxShadow: syncStatus.connected ? "0 0 6px var(--in)" : "none"
            }} />
            <span>{user.username}</span>
          </div>
        )}
      </header>

      <main id="view">
        {(tab === "o" || tab === "a") && (
          <div className="mnav">
            <button onClick={() => setM(shift(M, -1))} aria-label="Previous month">‹</button>
            <div style={{ textAlign: "center" }}>
              <b>{mname(M)}</b>
              {syncStatus.connected && (
                <div style={{ fontSize: "11px", color: "var(--in)", fontWeight: 500, marginTop: "1px" }}>
                  ● Cloud Sync: {user ? user.username : "Guest"}
                </div>
              )}
            </div>
            <button onClick={() => setM(shift(M, 1))} aria-label="Next month">›</button>
          </div>
        )}

        {tab === "o" && <HomeView S={S} M={M} setTab={setTab} setFilter={setFilter} />}
        {tab === "a" && (
          <ActivityView
            S={S}
            M={M}
            filter={filter}
            setFilter={setFilter}
            onOpenTx={(id) => setModal({ mode: "tx", id })}
          />
        )}
        {tab === "c" && (
          <AccountsView
            S={S}
            setTab={setTab}
            onViewSource={(id) => setModal({ mode: "source", id })}
            onViewCard={(id) => setModal({ mode: "card", id })}
          />
        )}
        {tab === "p" && (
          <PeopleView
            S={S}
            onOpenPerson={(personKey) => setModal({ mode: "person", personKey })}
            onOpenTx={(id, pre) => setModal({ mode: "tx", id, pre })}
          />
        )}
        {tab === "m" && (
          <MoreView
            S={S}
            updateState={updateState}
            setTab={setTab}
            syncStatus={syncStatus}
            user={user}
            onLogout={handleLogout}
            onShowAuth={() => setIsGuest(false)}
          />
        )}
      </main>

      {tab !== "m" && (
        <button className="pill" id="add" onClick={handleAddNew}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>{tab === "c" ? "Add account" : "Add entry"}</span>
        </button>
      )}

      <nav className="tabs" id="tabs">
        {TABS.map(({ k, l, svg }) => (
          <button
            key={k}
            className={tab === k ? "on" : ""}
            onClick={() => {
              setTab(k);
              window.scrollTo(0, 0);
            }}
          >
            <svg viewBox="0 0 24 24">{svg}</svg>
            {l}
          </button>
        ))}
      </nav>

      <SheetModal
        modal={modal}
        closeSheet={() => setModal(null)}
        setModal={setModal}
        S={S}
        M={M}
        setM={setM}
        tab={tab}
        updateState={updateState}
      />
    </>
  );
}
