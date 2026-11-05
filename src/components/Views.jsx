import React, { useRef } from "react";
import { getCat, defState } from "../constants/config";
import { calc, stats, sumv, fmt, safeSub, getAcc, dayOf, mi, txTitle, txSub, sign, ymd } from "../utils/currency";

export function RightNowSection({ S, setTab }) {
  const c = calc(S);
  const tot = sumv(c.bal);
  const h = sumv(c.held);
  const P = Object.values(c.P);
  const owe = P.reduce((s, p) => s + Math.max(p.owe, 0), 0);
  const owed = P.reduce((s, p) => s + Math.max(p.owed, 0), 0);

  return (
    <section>
      <h2>Your money right now</h2>
      <button className="row" onClick={() => setTab("c")}>
        <span className="t">In all accounts</span>
        <span className="a">{fmt(tot, S.cur)}</span>
      </button>
      {h > 0.005 && (
        <div className="row">
          <span className="t">Kept for others<br /><small>Not yours to spend</small></span>
          <span className="a out">− {fmt(h, S.cur)}</span>
        </div>
      )}
      <div className="row">
        <span className="t"><b>Yours to use</b></span>
        <span className="a in">{fmt(safeSub(tot, h), S.cur)}</span>
      </div>
      {owe > 0.005 && (
        <button className="row" onClick={() => setTab("p")}>
          <span className="t">You owe others</span>
          <span className="a out">{fmt(owe, S.cur)}</span>
        </button>
      )}
      {owed > 0.005 && (
        <button className="row" onClick={() => setTab("p")}>
          <span className="t">Others owe you</span>
          <span className="a in">{fmt(owed, S.cur)}</span>
        </button>
      )}
    </section>
  );
}

export function HomeView({ S, M, setTab, setFilter }) {
  if (!S.txs.length) {
    return (
      <div className="empty">
        <b>Let’s set this up</b>
        1. In Accounts, add your cash, banks and wallets with today’s balance.<br />
        2. Add your salary as income, then your spending.<br />
        3. Borrowed, lent or kept-for-someone money goes under People.<br /><br />
        <button className="btn" onClick={() => setTab("c")}>Set up accounts</button>
      </div>
    );
  }

  const st = stats(S, M);
  const base = Math.max(st.tin, st.spent + st.saved) || 1;
  const ents = Object.entries(st.byCat).sort((a, b) => b[1] - a[1]);
  const pct = (v) => (st.tin > 0 ? Math.round((v / st.tin) * 100) + "% of income" : "");
  const ac = Object.entries(st.byAcct).sort((a, b) => b[1] - a[1]);
  const mx = ac.length ? ac[0][1] : 1;
  const inc = Object.entries(st.inc).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="hero">
        <small>{st.left < 0 ? "Over by" : "Left this month"}</small>
        <div className={`big ${st.left < 0 ? "neg" : ""}`}>{fmt(Math.abs(st.left), S.cur)}</div>
        <div className="trio">
          <div><span>Came in</span><b>{fmt(st.tin, S.cur)}</b></div>
          <div><span>Spent</span><b>{fmt(st.spent, S.cur)}</b></div>
          <div><span>Saved</span><b>{fmt(st.saved, S.cur)}</b></div>
        </div>
      </div>

      {ents.length > 0 && (
        <section>
          <h2>Where your income went</h2>
          <div className="bar">
            {ents.map(([id, v]) => (
              <i key={id} style={{ width: `${(v / base) * 100}%`, background: getCat(id).c }} />
            ))}
            {st.left > 0 && <i className="free" style={{ width: `${(st.left / base) * 100}%` }} />}
          </div>
          {ents.map(([id, v]) => (
            <button
              key={id}
              className="row"
              onClick={() => {
                setFilter({ ft: "expense", fcat: id, fAcct: "" });
                setTab("a");
              }}
            >
              <span className="dot" style={{ background: getCat(id).c }} />
              <span className="t">{getCat(id).n}</span>
              <span className="a">{fmt(v, S.cur)}<small>{pct(v)}</small></span>
            </button>
          ))}
          {st.left > 0 && (
            <div className="row">
              <span className="dot" style={{ background: "var(--free)" }} />
              <span className="t">Not spent yet</span>
              <span className="a">{fmt(st.left, S.cur)}<small>{pct(st.left)}</small></span>
            </div>
          )}
        </section>
      )}

      {ac.length > 0 && (
        <section>
          <h2>Spent from which account</h2>
          {ac.map(([k, v]) => (
            <div key={k} className="row" style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{getAcc(S.accounts, k).name}</span>
                <b>{fmt(v, S.cur)}</b>
              </div>
              <div className="mini"><i style={{ width: `${(v / mx) * 100}%` }} /></div>
            </div>
          ))}
        </section>
      )}

      {inc.length > 0 && (
        <section>
          <h2>Income this month</h2>
          {inc.map(([k, v]) => (
            <div key={k} className="row">
              <span className="t">{k}</span>
              <span className="a in">{fmt(v, S.cur)}<small>{Math.round((v / st.tin) * 100)}%</small></span>
            </div>
          ))}
        </section>
      )}

      <RightNowSection S={S} setTab={setTab} />
    </>
  );
}

export function ActivityView({ S, M, filter, setFilter, onOpenTx }) {
  const { ft, fAcct, fcat } = filter;
  let rows = stats(S, M).rows;
  if (ft) rows = rows.filter((t) => t.type === ft);
  if (fAcct) rows = rows.filter((t) => t.acct === fAcct || t.to === fAcct);
  if (fcat) rows = rows.filter((t) => t.cat === fcat);

  const g = {};
  rows.forEach((t) => {
    const d = dayOf(t, M);
    (g[d] = g[d] || []).push(t);
  });
  const { y, o } = mi(M);
  const days = Object.keys(g).sort((a, b) => b - a);

  return (
    <section>
      <div style={{ display: "flex", gap: "8px" }}>
        <select value={ft} onChange={(e) => setFilter({ ...filter, ft: e.target.value })}>
          <option value="">Everything</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
          <option value="transfer">Transfers</option>
          <option value="people">People</option>
        </select>
        <select value={fAcct} onChange={(e) => setFilter({ ...filter, fAcct: e.target.value })}>
          <option value="">All accounts</option>
          {S.accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {fcat && (
        <div className="chips">
          <button onClick={() => setFilter({ ...filter, fcat: "" })}>{getCat(fcat).n} ✕</button>
        </div>
      )}
      <p className="note">{rows.length} entries</p>

      {!rows.length ? (
        <div className="empty">
          <b>Nothing here</b>Tap “Add entry” to record money in or out.
        </div>
      ) : (
        days.map((d) => (
          <React.Fragment key={d}>
            <div className="day">
              {new Date(y, o - 1, +d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            </div>
            {g[d].map((t) => {
              const s = sign(t);
              return (
                <button key={t.id} className="row" onClick={() => onOpenTx(t.id)}>
                  <span className="t">
                    <div>{txTitle(t)}</div>
                    <small>{txSub(t, S.accounts)}</small>
                  </span>
                  <span className={`a ${s > 0 ? "in" : s < 0 ? "out" : ""}`}>
                    {s > 0 ? "+" : s < 0 ? "−" : ""}{fmt(t.amount, S.cur)}
                  </span>
                </button>
              );
            })}
          </React.Fragment>
        ))
      )}
    </section>
  );
}

export function AccountsView({ S, setTab, onEditAcct }) {
  const c = calc(S);
  return (
    <>
      <RightNowSection S={S} setTab={setTab} />
      <section>
        <h2>Accounts</h2>
        {S.accounts.map((a) => (
          <button key={a.id} className="row" onClick={() => onEditAcct(a.id)}>
            <span className="t">
              <div>{a.name}</div>
              {c.held[a.id] > 0.005 && <small>Includes {fmt(c.held[a.id], S.cur)} kept for others</small>}
            </span>
            <span className={`a ${c.bal[a.id] < 0 ? "out" : ""}`}>{fmt(c.bal[a.id], S.cur)}</span>
          </button>
        ))}
        <p className="note" style={{ marginTop: "12px" }}>
          Add every place you keep money: cash, each bank, wallets. Tap one to rename or fix its balance.
        </p>
      </section>
    </>
  );
}

export function PeopleView({ S, onOpenPerson, onOpenTx }) {
  const c = calc(S);
  const L = Object.entries(c.P);
  const open = L.filter(([, p]) => [p.owe, p.owed, p.held].some((x) => Math.abs(x) > 0.005));

  if (!L.length) {
    return (
      <div className="empty">
        <b>No one yet</b>
        Track money you borrowed, lent, or are keeping for someone, and see who owes what.<br /><br />
        <button className="btn" onClick={() => onOpenTx("", { type: "people" })}>Add entry</button>
      </div>
    );
  }

  return (
    <section style={{ paddingTop: "12px" }}>
      <h2>Who owes what</h2>
      {open.length ? (
        open.map(([k, p]) => (
          <button key={k} className="row" onClick={() => onOpenPerson(k)}>
            <span className="t">{p.name}</span>
            <span className="a">
              {p.owe > 0.005 && <><span className="out">You owe {fmt(p.owe, S.cur)}</span><br /></>}
              {p.owed > 0.005 && <><span className="in">Owes you {fmt(p.owed, S.cur)}</span><br /></>}
              {p.held > 0.005 && <span>Keeping {fmt(p.held, S.cur)}</span>}
            </span>
          </button>
        ))
      ) : (
        <p className="note">Everyone is settled.</p>
      )}
      {L.length > open.length && <p className="note">{L.length - open.length} settled</p>}
    </section>
  );
}

export function MoreView({ S, updateState, setTab, syncStatus }) {
  const inpRef = useRef(null);

  const exportData = () => {
    const b = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = "where-it-goes-backup-" + ymd(new Date()) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const importData = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!Array.isArray(d.accounts) || !Array.isArray(d.txs) || !d.accounts.length) throw new Error();
        if (window.confirm("Replace everything on this device (and sync to cloud) with this backup?")) {
          updateState(Object.assign(defState(), d));
          setTab("o");
        }
      } catch (err) {
        alert("That file isn’t a valid backup from this version.");
      }
      e.target.value = "";
    };
    r.readAsText(f);
  };

  const wipeAll = () => {
    if (window.confirm("Delete all accounts and entries on this device?")) {
      const next = defState();
      next.cur = S.cur;
      updateState(next);
      setTab("o");
    }
  };

  return (
    <>
      <section style={{ paddingTop: "18px" }}>
        <h2>Cloud Sync Status</h2>
        <div className="sync-badge">
          <span className={`sync-dot ${syncStatus.connected ? "live" : syncStatus.error ? "err" : ""}`} />
          <span>{syncStatus.message}</span>
        </div>
        <p className="note">
          Cloud sync is fully automated and pre-configured out of the box. Any entries you add on your phone or laptop sync instantly.
        </p>
      </section>

      <section>
        <h2>JSON File Backup & Restore</h2>
        <p className="note">
          You can also download a full `.json` snapshot to save in your Google Drive or local files anytime, or restore from a backup file.
        </p>
        <div className="acts">
          <button className="btn" onClick={exportData}>Save JSON backup</button>
          <button className="btn sec" onClick={() => inpRef.current?.click()}>Restore JSON</button>
        </div>
        <input ref={inpRef} type="file" accept=".json,application/json" hidden onChange={importData} />
      </section>

      <section>
        <h2>Currency</h2>
        <select value={S.cur} onChange={(e) => updateState({ ...S, cur: e.target.value })}>
          {["INR", "USD", "EUR", "GBP", "AED"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </section>

      <section>
        <h2>Use on iPhone / Android, offline</h2>
        <p className="note">
          Open this page in Safari or Chrome, tap Share / Menu, then “Add to Home Screen”. It opens like a native app and works offline.
        </p>
      </section>

      <section>
        <button className="btn del" onClick={wipeAll}>Delete all data</button>
      </section>
    </>
  );
}
