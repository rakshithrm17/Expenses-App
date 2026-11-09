import React, { useRef, useState } from "react";
import { getCat, defState } from "../constants/config";
import {
  calc,
  stats,
  sumv,
  fmt,
  safeAdd,
  safeSub,
  getAcc,
  dayOf,
  mi,
  txTitle,
  txSub,
  sign,
  ymd,
  getCardDetails
} from "../utils/currency";

export function RightNowSection({ S, setTab }) {
  const c = calc(S);
  const bankAccounts = S.accounts.filter((a) => a.type !== "card");
  const cardAccounts = S.accounts.filter((a) => a.type === "card");

  const totBank = bankAccounts.reduce((s, a) => safeAdd(s, c.bal[a.id] || 0), 0);
  const totCardDebt = cardAccounts.reduce((s, a) => {
    const b = c.bal[a.id] || 0;
    return b < 0 ? safeAdd(s, Math.abs(b)) : s;
  }, 0);

  const totHeld = sumv(c.held);
  const totLent = sumv(c.lent);
  const totOwe = sumv(c.owe);

  // Net user: Liquid Bank Cash + Lent - Kept - Owed to People - Credit Card Outstanding Debt
  const netUser = safeSub(
    safeAdd(totBank, totLent),
    safeAdd(safeAdd(totHeld, totOwe), totCardDebt)
  );

  // Shortage check: does total bank cash cover all immediate obligations (kept money + credit card dues)?
  const totalObligations = safeAdd(totHeld, totCardDebt);
  const globShortage = totalObligations > totBank ? safeSub(totalObligations, Math.max(0, totBank)) : 0;

  return (
    <section>
      <h2>Your money right now</h2>
      <button className="row" onClick={() => setTab("c")}>
        <span className="t">Cash in bank &amp; wallet</span>
        <span className="a">{fmt(totBank, S.cur)}</span>
      </button>

      {totCardDebt > 0.005 && (
        <button className="row" onClick={() => setTab("c")}>
          <span className="t" style={{ color: "var(--out)" }}>
            <b>Credit card dues (Bank debt)</b><br />
            <small style={{ color: "var(--out)" }}>Must be paid on due dates</small>
          </span>
          <span className="a out">− {fmt(totCardDebt, S.cur)}</span>
        </button>
      )}

      {totHeld > 0.005 && (
        <button className="row" onClick={() => setTab("p")}>
          <span className="t" style={{ color: "var(--out)" }}>
            <b>Someone’s money kept with you</b><br />
            <small style={{ color: "var(--out)" }}>Not yours to spend</small>
          </span>
          <span className="a out">− {fmt(totHeld, S.cur)}</span>
        </button>
      )}

      {totLent > 0.005 && (
        <button className="row" onClick={() => setTab("p")}>
          <span className="t" style={{ color: "var(--in)" }}>
            <b>Money you lent</b><br />
            <small>Has to come back</small>
          </span>
          <span className="a in">+ {fmt(totLent, S.cur)}</span>
        </button>
      )}

      {totOwe > 0.005 && (
        <button className="row" onClick={() => setTab("p")}>
          <span className="t" style={{ color: "var(--out)" }}>
            <b>You owe others (Borrowed)</b>
          </span>
          <span className="a out">− {fmt(totOwe, S.cur)}</span>
        </button>
      )}

      <div className="row" style={{ borderTop: "1.5px solid var(--line)", paddingTop: "10px" }}>
        <span className="t">
          <b>Your actual own money</b><br />
          <small>Cash + Lent − Kept − Card Dues</small>
        </span>
        <span className={`a ${netUser >= 0 ? "in" : "out"}`} style={{ fontSize: "18px" }}>
          <b>{fmt(netUser, S.cur)}</b>
        </span>
      </div>

      {globShortage > 0.005 && (
        <div style={{
          background: "rgba(200,69,31,0.08)",
          border: "1.5px solid var(--out)",
          borderRadius: "10px",
          padding: "10px 13px",
          marginTop: "12px",
          fontSize: "13px",
          color: "var(--ink)",
          lineHeight: 1.4
        }}>
          <b style={{ color: "var(--out)" }}>⚠️ Total cash shortage: {fmt(globShortage, S.cur)}</b><br />
          Total bank cash is <b>{fmt(totBank, S.cur)}</b>, but you have <b>{fmt(totalObligations, S.cur)}</b> in dues ({fmt(totHeld, S.cur)} kept for others + {fmt(totCardDebt, S.cur)} credit card dues). Still short by <b>{fmt(globShortage, S.cur)}</b> to clear everything right now.
        </div>
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
              const cls = t.skipAcct ? "" : s > 0 ? "in" : s < 0 ? "out" : "";
              const pfx = t.skipAcct ? "" : s > 0 ? "+" : s < 0 ? "−" : "";
              return (
                <button key={t.id} className="row" onClick={() => onOpenTx(t.id)}>
                  <span className="t">
                    <div>{txTitle(t)}</div>
                    <small>{txSub(t, S.accounts)}</small>
                  </span>
                  <span className={`a ${cls}`}>
                    {pfx}{fmt(t.amount, S.cur)}
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

export function AccountsView({ S, setTab, onViewSource, onViewCard }) {
  const c = calc(S);
  const bankAccounts = S.accounts.filter((a) => a.type !== "card");
  const cardAccounts = S.accounts.filter((a) => a.type === "card");

  const totBank = bankAccounts.reduce((s, a) => safeAdd(s, c.bal[a.id] || 0), 0);
  const totCardDebt = cardAccounts.reduce((s, a) => {
    const b = c.bal[a.id] || 0;
    return b < 0 ? safeAdd(s, Math.abs(b)) : s;
  }, 0);

  return (
    <>
      <RightNowSection S={S} setTab={setTab} />

      {/* 1. Liquid Bank & Cash Accounts */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <h2>Bank &amp; Cash (Liquid)</h2>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>{fmt(totBank, S.cur)}</span>
        </div>

        {bankAccounts.map((a) => {
          const b = c.bal[a.id] || 0;
          const h = c.held[a.id] || 0;
          const l = c.lent[a.id] || 0;
          const o = c.owe[a.id] || 0;
          const myMoney = safeSub(safeAdd(b, l), safeAdd(h, o));

          const subParts = [];
          if (h > 0.005) {
            subParts.push(<span key="h" style={{ color: "var(--out)" }}>Kept: −{fmt(h, S.cur)}</span>);
          }
          if (l > 0.005) {
            subParts.push(<span key="l" style={{ color: "var(--in)" }}>Lent: +{fmt(l, S.cur)}</span>);
          }
          if (h > b) {
            subParts.push(
              <span key="shortage" style={{ color: "var(--out)", fontWeight: 600 }}>
                Shortage: −{fmt(safeSub(h, b), S.cur)}
              </span>
            );
          }
          subParts.push(
            <span key="my">
              Your money: <b>{fmt(myMoney, S.cur)}</b>
            </span>
          );

          return (
            <button key={a.id} className="row" onClick={() => onViewSource(a.id)}>
              <span className="t">
                <div><b>{a.name}</b></div>
                <small>
                  {subParts.map((part, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && " · "}
                      {part}
                    </React.Fragment>
                  ))}
                </small>
              </span>
              <span className={`a ${b < 0 ? "out" : ""}`}>
                {fmt(b, S.cur)}
                <small>balance</small>
              </span>
            </button>
          );
        })}
        <p className="note" style={{ marginTop: "10px" }}>
          Tap any bank account for its clarity breakdown (your money vs someone’s money vs shortage).
        </p>
      </section>

      {/* 2. Credit Cards & Credit Lines */}
      <section style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <h2>Credit Cards &amp; Credit Lines</h2>
          {totCardDebt > 0 && (
            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--out)" }}>
              Due: {fmt(totCardDebt, S.cur)}
            </span>
          )}
        </div>

        {cardAccounts.length === 0 ? (
          <div style={{ padding: "16px", background: "var(--card)", borderRadius: "12px", border: "1.5px dashed var(--line)", textAlign: "center", color: "var(--mute)", fontSize: "13.5px" }}>
            No credit cards added yet.<br />
            Tap <b>Add account</b> to add a RuPay or Visa card with limit &amp; statement billing cycle.
          </div>
        ) : (
          cardAccounts.map((card) => {
            const details = getCardDetails(card, S, c);
            const isRupay = card.cardType === "rupay";
            const utilColor = details.utilization > 70 ? "var(--out)" : details.utilization > 30 ? "#D9822B" : "var(--in)";

            return (
              <button key={card.id} className="row" onClick={() => onViewCard(card.id)} style={{ display: "block", padding: "12px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <b>{card.name}</b>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 650,
                      padding: "2px 6px",
                      borderRadius: "6px",
                      background: isRupay ? "rgba(11,122,99,0.12)" : "rgba(63,108,143,0.12)",
                      color: isRupay ? "var(--in)" : "#3F6C8F"
                    }}>
                      {isRupay ? "⚡ RuPay UPI" : "💳 Card"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontWeight: 600, color: details.debt > 0 ? "var(--out)" : "var(--in)" }}>
                      {details.debt > 0 ? `− ${fmt(details.debt, S.cur)}` : "Cleared"}
                    </span>
                    <small style={{ display: "block", color: "var(--mute)", fontSize: "11.5px" }}>
                      {details.debt > 0 ? "total due" : "no dues"}
                    </small>
                  </div>
                </div>

                {/* Credit limit utilization bar */}
                <div className="mini" style={{ height: "6px", margin: "6px 0 8px" }}>
                  <i style={{ width: `${Math.min(100, details.utilization)}%`, background: utilColor }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "var(--mute)" }}>
                  <span>
                    Avail: <b style={{ color: "var(--ink)" }}>{fmt(details.available, S.cur)}</b> of {fmt(details.limit, S.cur)} ({details.utilization}%)
                  </span>
                  <span>
                    {details.remainingBilled > 0 ? (
                      <span style={{ color: "var(--out)", fontWeight: 500 }}>
                        Bill: {fmt(details.remainingBilled, S.cur)} due {details.dueDay}th
                      </span>
                    ) : details.debt > 0 ? (
                      <span style={{ color: "var(--in)", fontWeight: 500 }}>✓ Bill Cleared</span>
                    ) : (
                      "0 Dues"
                    )}
                  </span>
                </div>
              </button>
            );
          })
        )}
        <p className="note" style={{ marginTop: "10px" }}>
          Tap any card to view statement, unbilled spends, or 1-tap clear your bill from your bank.
        </p>
      </section>
    </>
  );
}

export function PeopleView({ S, onOpenPerson, onOpenTx }) {
  const [showSettled, setShowSettled] = useState(false);
  const c = calc(S);
  const L = Object.entries(c.P);
  const open = L.filter(([, p]) => [p.owe, p.owed, p.held].some((x) => Math.abs(x) > 0.005));
  const settled = L.filter(([, p]) => [p.owe, p.owed, p.held].every((x) => Math.abs(x) <= 0.005));

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

      {settled.length > 0 && (
        <div style={{ marginTop: "18px" }}>
          <button
            type="button"
            className="btn sec"
            style={{
              width: "100%",
              padding: "9px 12px",
              fontSize: "13.5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
            onClick={() => setShowSettled(!showSettled)}
          >
            <span>Settled / Cleared ({settled.length})</span>
            <span style={{ fontSize: "12px", color: "var(--mute)" }}>{showSettled ? "▲ Hide" : "▼ View"}</span>
          </button>
          {showSettled && (
            <div style={{ marginTop: "8px" }}>
              {settled.map(([k, p]) => (
                <button key={k} className="row" onClick={() => onOpenPerson(k)} style={{ opacity: 0.85 }}>
                  <span className="t">
                    <div>{p.name}</div>
                    <small style={{ color: "var(--in)", fontWeight: 500 }}>✓ All cleared</small>
                  </span>
                  <span className="a" style={{ color: "var(--mute)", fontSize: "13px" }}>Settled ›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function MoreView({ S, updateState, setTab, syncStatus, user, onLogout, onShowAuth }) {
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
        <h2>Account & Security</h2>
        {user ? (
          <div className="card-box" style={{ marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--mute)" }}>Logged in as</div>
                <div style={{ fontWeight: 650, fontSize: "15px", marginTop: "2px" }}>
                  {user.username}
                </div>
                <div style={{ fontSize: "11px", color: "var(--in)", marginTop: "4px", fontWeight: 500 }}>
                  ● Private Cloud Ledger: ledgers/{user.key}
                </div>
              </div>
              <button
                type="button"
                className="btn sec"
                onClick={onLogout}
                style={{ padding: "6px 12px", fontSize: "13px", borderRadius: "10px" }}
              >
                Log out
              </button>
            </div>
          </div>
        ) : (
          <div className="card-box" style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "13.5px", color: "var(--mute)", marginBottom: "10px" }}>
              You are using <b>Guest Mode</b> (Offline on this device only).
            </div>
            <button
              type="button"
              className="btn"
              onClick={onShowAuth}
              style={{ width: "100%", padding: "10px" }}
            >
              Sign in to enable Private Cloud Sync
            </button>
          </div>
        )}
      </section>

      <section>
        <h2>Cloud Sync Status</h2>
        <div className="sync-badge">
          <span className={`sync-dot ${syncStatus.connected ? "live" : syncStatus.error ? "err" : ""}`} />
          <span>{syncStatus.message}</span>
        </div>
        <p className="note">
          {user
            ? "Your data is strictly encrypted and synced exclusively to your private account."
            : "Sign in to back up and sync your ledger across your phone, tablet, and laptop."}
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
