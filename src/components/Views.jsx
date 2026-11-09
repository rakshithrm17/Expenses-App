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
    <section style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h2 style={{ margin: 0 }}>
          <span>Your Money Right Now</span>
        </h2>
        <span style={{ fontSize: "11.5px", fontWeight: 650, color: "var(--mute)", background: "var(--card-subtle)", padding: "3px 8px", borderRadius: "12px", border: "1px solid var(--line)" }}>
          Live Balance
        </span>
      </div>

      {/* 1. Cash in Bank & Wallet */}
      <button className="row" onClick={() => setTab("c")} style={{ padding: "10px 10px" }}>
        <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--in-bg)", border: "1px solid var(--in-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flex: "none" }}>
          🏦
        </div>
        <span className="t">
          <div>Cash in bank &amp; wallet</div>
          <small>Liquid money immediately available</small>
        </span>
        <span className="a" style={{ fontSize: "16px" }}>{fmt(totBank, S.cur)}</span>
      </button>

      {/* 2. Credit Card Dues */}
      {totCardDebt > 0.005 && (
        <button className="row" onClick={() => setTab("c")} style={{ padding: "10px 10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--out-bg)", border: "1px solid var(--out-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flex: "none" }}>
            💳
          </div>
          <span className="t">
            <div style={{ color: "var(--out)" }}>Credit card dues (Bank debt)</div>
            <small style={{ color: "var(--out)", opacity: 0.85 }}>Must be cleared on due dates</small>
          </span>
          <span className="a out" style={{ fontSize: "16px" }}>− {fmt(totCardDebt, S.cur)}</span>
        </button>
      )}

      {/* 3. Kept for someone */}
      {totHeld > 0.005 && (
        <button className="row" onClick={() => setTab("p")} style={{ padding: "10px 10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--out-bg)", border: "1px solid var(--out-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flex: "none" }}>
            🔒
          </div>
          <span className="t">
            <div style={{ color: "var(--out)" }}>Someone’s money kept with you</div>
            <small style={{ color: "var(--out)", opacity: 0.85 }}>In your account, but not yours to spend</small>
          </span>
          <span className="a out" style={{ fontSize: "16px" }}>− {fmt(totHeld, S.cur)}</span>
        </button>
      )}

      {/* 4. Lent money */}
      {totLent > 0.005 && (
        <button className="row" onClick={() => setTab("p")} style={{ padding: "10px 10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--in-bg)", border: "1px solid var(--in-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flex: "none" }}>
            🤝
          </div>
          <span className="t">
            <div style={{ color: "var(--in)" }}>Money you lent</div>
            <small style={{ color: "var(--in)", opacity: 0.85 }}>Pending to be collected back</small>
          </span>
          <span className="a in" style={{ fontSize: "16px" }}>+ {fmt(totLent, S.cur)}</span>
        </button>
      )}

      {/* 5. You owe */}
      {totOwe > 0.005 && (
        <button className="row" onClick={() => setTab("p")} style={{ padding: "10px 10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--out-bg)", border: "1px solid var(--out-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", flex: "none" }}>
            ⏳
          </div>
          <span className="t">
            <div style={{ color: "var(--out)" }}>You owe others (Borrowed)</div>
            <small style={{ color: "var(--out)", opacity: 0.85 }}>Pending to be returned</small>
          </span>
          <span className="a out" style={{ fontSize: "16px" }}>− {fmt(totOwe, S.cur)}</span>
        </button>
      )}

      {/* 6. True Net Worth Card */}
      <div style={{
        marginTop: "12px",
        padding: "14px",
        background: "var(--card-subtle)",
        border: "1.5px solid var(--line)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <div style={{ fontWeight: 750, fontSize: "15px", color: "var(--ink)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>✨ Your Actual Own Money</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--mute)", marginTop: "2px" }}>
            Liquid Cash + Lent − Kept − Card Dues
          </div>
        </div>
        <div className={`a ${netUser >= 0 ? "in" : "out"}`} style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.02em" }}>
          {fmt(netUser, S.cur)}
        </div>
      </div>

      {/* Shortage alert */}
      {globShortage > 0.005 && (
        <div style={{
          background: "var(--out-bg)",
          border: "1.5px solid var(--out-border)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          marginTop: "12px",
          fontSize: "13px",
          color: "var(--ink)",
          lineHeight: 1.45
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span style={{ fontSize: "16px" }}>⚠️</span>
            <b style={{ color: "var(--out)", fontSize: "14px" }}>Total Cash Shortage: {fmt(globShortage, S.cur)}</b>
          </div>
          <div>
            Total bank cash is <b>{fmt(totBank, S.cur)}</b>, but you have <b>{fmt(totalObligations, S.cur)}</b> in dues ({fmt(totHeld, S.cur)} kept for others + {fmt(totCardDebt, S.cur)} credit card dues). Still short by <b>{fmt(globShortage, S.cur)}</b> to clear everything right now.
          </div>
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
        <p style={{ marginTop: "6px", lineHeight: 1.5 }}>
          1. In Accounts, add your cash, banks and wallets with today’s balance.<br />
          2. Add your salary as income, then your spending.<br />
          3. Borrowed, lent or kept-for-someone money goes under People.
        </p>
        <div style={{ marginTop: "18px" }}>
          <button className="btn" onClick={() => setTab("c")}>Set up accounts</button>
        </div>
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
      {/* 1. Hero Balance Overview */}
      <div className="hero">
        <small>{st.left < 0 ? "⚠️ Over budget by" : "Remaining This Month"}</small>
        <div className={`big ${st.left < 0 ? "neg" : ""}`}>{fmt(Math.abs(st.left), S.cur)}</div>
        <div className="trio">
          <div>
            <span>Came in</span>
            <b>{fmt(st.tin, S.cur)}</b>
          </div>
          <div>
            <span>Spent</span>
            <b>{fmt(st.spent, S.cur)}</b>
          </div>
          <div>
            <span>Saved</span>
            <b>{fmt(st.saved, S.cur)}</b>
          </div>
        </div>
      </div>

      {/* 2. Where Income Went (Categories) */}
      {ents.length > 0 && (
        <section>
          <h2>
            <span>Where Your Income Went</span>
            <span style={{ fontSize: "12px", color: "var(--mute)", fontWeight: 500 }}>
              {ents.length} categories
            </span>
          </h2>

          <div className="bar">
            {ents.map(([id, v]) => (
              <i key={id} style={{ width: `${(v / base) * 100}%`, background: getCat(id).c }} />
            ))}
            {st.left > 0 && <i className="free" style={{ width: `${(st.left / base) * 100}%` }} />}
          </div>

          <div style={{ marginTop: "8px" }}>
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
                <span className="t">
                  <div>{getCat(id).n}</div>
                </span>
                <span className="a">
                  {fmt(v, S.cur)}
                  <small style={{ color: "var(--mute)" }}>{pct(v)}</small>
                </span>
              </button>
            ))}

            {st.left > 0 && (
              <div className="row">
                <span className="dot" style={{ background: "var(--free)" }} />
                <span className="t">
                  <div>Not spent yet</div>
                  <small>Available savings buffer</small>
                </span>
                <span className="a in">
                  {fmt(st.left, S.cur)}
                  <small>{pct(st.left)}</small>
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Spent from which account */}
      {ac.length > 0 && (
        <section>
          <h2>Spent from Which Account</h2>
          {ac.map(([k, v]) => (
            <div key={k} className="row" style={{ display: "block", padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, fontSize: "14px" }}>{getAcc(S.accounts, k).name}</span>
                <b style={{ fontSize: "14.5px" }}>{fmt(v, S.cur)}</b>
              </div>
              <div className="mini">
                <i style={{ width: `${(v / mx) * 100}%`, background: "var(--ink)" }} />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 4. Income this month */}
      {inc.length > 0 && (
        <section>
          <h2>Income This Month</h2>
          {inc.map(([k, v]) => (
            <div key={k} className="row">
              <span className="t">
                <div>{k}</div>
              </span>
              <span className="a in">
                +{fmt(v, S.cur)}
                <small>{Math.round((v / st.tin) * 100)}% of total</small>
              </span>
            </div>
          ))}
        </section>
      )}

      {/* 5. Right Now Section on Home */}
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
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
        <select
          value={ft}
          onChange={(e) => setFilter({ ...filter, ft: e.target.value })}
          style={{ flex: 1 }}
        >
          <option value="">All Types</option>
          <option value="income">Income (+)</option>
          <option value="expense">Expenses (−)</option>
          <option value="transfer">Transfers (⇄)</option>
          <option value="people">People (👥)</option>
        </select>
        <select
          value={fAcct}
          onChange={(e) => setFilter({ ...filter, fAcct: e.target.value })}
          style={{ flex: 1 }}
        >
          <option value="">All Accounts</option>
          {S.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} {a.type === "card" ? (a.cardType === "rupay" ? "(RuPay UPI)" : "(Card)") : ""}
            </option>
          ))}
        </select>
      </div>

      {fcat && (
        <div className="chips" style={{ marginBottom: "10px" }}>
          <button onClick={() => setFilter({ ...filter, fcat: "" })} style={{ background: "var(--card-subtle)" }}>
            {getCat(fcat).n} ✕
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "12px", color: "var(--mute)", fontWeight: 600 }}>
          {rows.length} {rows.length === 1 ? "entry" : "entries"} found
        </span>
      </div>

      {!rows.length ? (
        <div className="empty">
          <b>Nothing here</b>
          Tap “Add entry” to record money in or out.
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

              let typeIcon = "💰";
              let iconBg = "var(--card-subtle)";
              if (t.type === "income") {
                typeIcon = "↗";
                iconBg = "var(--in-bg)";
              } else if (t.type === "expense") {
                typeIcon = "↘";
                iconBg = "var(--out-bg)";
              } else if (t.type === "transfer") {
                typeIcon = "⇄";
                iconBg = "rgba(37, 99, 235, 0.1)";
              } else if (t.type === "people") {
                typeIcon = "👥";
                iconBg = "var(--warn-bg)";
              }

              return (
                <button key={t.id} className="row" onClick={() => onOpenTx(t.id)}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "15px",
                    color: t.type === "income" ? "var(--in)" : t.type === "expense" ? "var(--out)" : "var(--ink)",
                    flex: "none"
                  }}>
                    {typeIcon}
                  </div>
                  <span className="t">
                    <div>{txTitle(t)}</div>
                    <small>{txSub(t, S.accounts)}</small>
                  </span>
                  <span className={`a ${cls}`}>
                    {pfx}{fmt(t.amount, S.cur)}
                    {t.skipAcct && (
                      <small style={{ fontSize: "10px", color: "var(--mute)", fontWeight: 500 }}>
                        (past record)
                      </small>
                    )}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
          <h2>Bank &amp; Cash (Liquid)</h2>
          <span style={{ fontSize: "15px", fontWeight: 750, color: "var(--ink)" }}>{fmt(totBank, S.cur)}</span>
        </div>

        {bankAccounts.map((a) => {
          const b = c.bal[a.id] || 0;
          const h = c.held[a.id] || 0;
          const l = c.lent[a.id] || 0;
          const o = c.owe[a.id] || 0;
          const myMoney = safeSub(safeAdd(b, l), safeAdd(h, o));

          return (
            <button key={a.id} className="row" onClick={() => onViewSource(a.id)} style={{ padding: "12px 10px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "var(--card-subtle)",
                border: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "13px",
                color: "var(--ink)",
                flex: "none"
              }}>
                {a.name.slice(0, 3).toUpperCase()}
              </div>

              <span className="t">
                <div style={{ fontSize: "15px" }}><b>{a.name}</b></div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                  {h > 0.005 && (
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", borderRadius: "6px", background: "var(--out-bg)", color: "var(--out)" }}>
                      Kept: −{fmt(h, S.cur)}
                    </span>
                  )}
                  {l > 0.005 && (
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", borderRadius: "6px", background: "var(--in-bg)", color: "var(--in)" }}>
                      Lent: +{fmt(l, S.cur)}
                    </span>
                  )}
                  {h > b && (
                    <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "6px", background: "var(--out-bg)", color: "var(--out)" }}>
                      Short: −{fmt(safeSub(h, b), S.cur)}
                    </span>
                  )}
                  <span style={{ fontSize: "11.5px", color: "var(--mute)" }}>
                    Your money: <b style={{ color: "var(--ink)" }}>{fmt(myMoney, S.cur)}</b>
                  </span>
                </div>
              </span>

              <span className={`a ${b < 0 ? "out" : ""}`} style={{ fontSize: "16px" }}>
                {fmt(b, S.cur)}
                <small>balance ›</small>
              </span>
            </button>
          );
        })}

        <p className="note" style={{ marginTop: "12px" }}>
          Tap any bank account for its clarity breakdown (your money vs someone’s money vs shortage).
        </p>
      </section>

      {/* 2. Credit Cards & Credit Lines */}
      <section style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
          <h2>Credit Cards &amp; Credit Lines</h2>
          {totCardDebt > 0 && (
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--out)" }}>
              Total Due: {fmt(totCardDebt, S.cur)}
            </span>
          )}
        </div>

        {cardAccounts.length === 0 ? (
          <div style={{ padding: "20px", background: "var(--card-subtle)", borderRadius: "var(--radius-md)", border: "1.5px dashed var(--line)", textAlign: "center", color: "var(--mute)", fontSize: "13.5px" }}>
            No credit cards added yet.<br />
            Tap <b>Add account</b> to add a RuPay or Visa card with limit &amp; statement billing cycle.
          </div>
        ) : (
          cardAccounts.map((card) => {
            const details = getCardDetails(card, S, c);
            const isRupay = card.cardType === "rupay";
            const utilColor = details.utilization > 70 ? "var(--out)" : details.utilization > 30 ? "var(--warn)" : "var(--in)";

            return (
              <button
                key={card.id}
                className="row"
                onClick={() => onViewCard(card.id)}
                style={{
                  display: "block",
                  padding: "14px",
                  background: "var(--card-subtle)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "10px"
                }}
              >
                {/* Header row: Card name + Network badge + Total Debt */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "17px" }}>{isRupay ? "⚡" : "💳"}</span>
                    <b style={{ fontSize: "15px", color: "var(--ink)" }}>{card.name}</b>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      background: isRupay ? "var(--in-bg)" : "rgba(37, 99, 235, 0.1)",
                      color: isRupay ? "var(--in)" : "var(--accent)"
                    }}>
                      {isRupay ? "RuPay UPI" : "Card"}
                    </span>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontWeight: 750, fontSize: "15px", color: details.debt > 0 ? "var(--out)" : "var(--in)" }}>
                      {details.debt > 0 ? `− ${fmt(details.debt, S.cur)}` : "✓ Cleared"}
                    </span>
                  </div>
                </div>

                {/* Credit limit utilization progress bar */}
                <div className="mini" style={{ height: "6px", margin: "8px 0" }}>
                  <i style={{ width: `${Math.min(100, details.utilization)}%`, background: utilColor }} />
                </div>

                {/* Footer details: Available limit & Statement Due */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "var(--mute)", marginTop: "4px" }}>
                  <span>
                    Avail: <b style={{ color: "var(--ink)" }}>{fmt(details.available, S.cur)}</b> of {fmt(details.limit, S.cur)} ({details.utilization}%)
                  </span>
                  <span>
                    {details.remainingBilled > 0 ? (
                      <span style={{ color: "var(--out)", fontWeight: 650 }}>
                        Bill: {fmt(details.remainingBilled, S.cur)} due {details.dueDay}th ›
                      </span>
                    ) : details.debt > 0 ? (
                      <span style={{ color: "var(--in)", fontWeight: 600 }}>
                        ✓ Bill Cleared ›
                      </span>
                    ) : (
                      <span style={{ color: "var(--in)" }}>0 Dues ›</span>
                    )}
                  </span>
                </div>
              </button>
            );
          })
        )}

        <p className="note" style={{ marginTop: "12px" }}>
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
        <p style={{ marginTop: "6px" }}>
          Track money you borrowed, lent, or are keeping for someone, and see who owes what.
        </p>
        <div style={{ marginTop: "16px" }}>
          <button className="btn" onClick={() => onOpenTx("", { type: "people" })}>Add entry</button>
        </div>
      </div>
    );
  }

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "12px" }}>
        <h2>Who Owes What</h2>
        <span style={{ fontSize: "12.5px", color: "var(--mute)", fontWeight: 600 }}>
          {open.length} active
        </span>
      </div>

      {open.length ? (
        open.map(([k, p]) => (
          <button key={k} className="row" onClick={() => onOpenPerson(k)} style={{ padding: "12px 10px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 750,
              fontSize: "15px",
              flex: "none"
            }}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span className="t">
              <div style={{ fontSize: "15px" }}><b>{p.name}</b></div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
                {p.owe > 0.005 && (
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--out)", background: "var(--out-bg)", padding: "1px 6px", borderRadius: "4px" }}>
                    You owe
                  </span>
                )}
                {p.owed > 0.005 && (
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--in)", background: "var(--in-bg)", padding: "1px 6px", borderRadius: "4px" }}>
                    Owes you
                  </span>
                )}
                {p.held > 0.005 && (
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--warn)", background: "var(--warn-bg)", padding: "1px 6px", borderRadius: "4px" }}>
                    Keeping
                  </span>
                )}
              </div>
            </span>
            <span className="a">
              {p.owe > 0.005 && <div className="out">−{fmt(p.owe, S.cur)}</div>}
              {p.owed > 0.005 && <div className="in">+{fmt(p.owed, S.cur)}</div>}
              {p.held > 0.005 && <div style={{ color: "var(--ink)", fontSize: "13.5px" }}>{fmt(p.held, S.cur)}</div>}
              <small>details ›</small>
            </span>
          </button>
        ))
      ) : (
        <div style={{ padding: "16px", textAlign: "center", color: "var(--in)", fontWeight: 600, background: "var(--in-bg)", borderRadius: "var(--radius-sm)" }}>
          ✓ Everyone is completely settled!
        </div>
      )}

      {settled.length > 0 && (
        <div style={{ marginTop: "18px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
          <button
            type="button"
            className="btn sec"
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: "13.5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderRadius: "var(--radius-sm)"
            }}
            onClick={() => setShowSettled(!showSettled)}
          >
            <span>Settled &amp; Cleared Contacts ({settled.length})</span>
            <span style={{ fontSize: "12px", color: "var(--mute)" }}>{showSettled ? "▲ Hide" : "▼ View"}</span>
          </button>

          {showSettled && (
            <div style={{ marginTop: "10px" }}>
              {settled.map(([k, p]) => (
                <button key={k} className="row" onClick={() => onOpenPerson(k)} style={{ opacity: 0.85 }}>
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "var(--card-subtle)",
                    border: "1px solid var(--line)",
                    color: "var(--mute)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 650,
                    fontSize: "13px",
                    flex: "none"
                  }}>
                    ✓
                  </div>
                  <span className="t">
                    <div>{p.name}</div>
                    <small style={{ color: "var(--in)", fontWeight: 500 }}>All cleared</small>
                  </span>
                  <span className="a" style={{ color: "var(--mute)", fontSize: "13px" }}>History ›</span>
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
      {/* 1. Account & Security Card */}
      <section>
        <h2>Account &amp; Security</h2>
        {user ? (
          <div className="card-box" style={{ marginTop: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "17px"
                }}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 750, fontSize: "16px", color: "var(--ink)" }}>
                    {user.username}
                  </div>
                  <div style={{ fontSize: "11.5px", color: "var(--in)", marginTop: "2px", fontWeight: 600 }}>
                    ● Private Cloud Ledger: ledgers/{user.key}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn sec"
                onClick={onLogout}
                style={{ padding: "8px 14px", fontSize: "13px" }}
              >
                Log out
              </button>
            </div>
          </div>
        ) : (
          <div className="card-box" style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "14px", color: "var(--mute)", marginBottom: "12px" }}>
              You are currently using <b>Guest Mode</b> (Saved offline on this device only).
            </div>
            <button
              type="button"
              className="btn"
              onClick={onShowAuth}
              style={{ width: "100%", padding: "12px" }}
            >
              Sign in to Enable Private Cloud Sync
            </button>
          </div>
        )}
      </section>

      {/* 2. Cloud Sync Status */}
      <section>
        <h2>Cloud Sync Status</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
          <div className="sync-badge">
            <span className={`sync-dot ${syncStatus.connected ? "live" : syncStatus.error ? "err" : ""}`} />
            <span>{syncStatus.message}</span>
          </div>
        </div>
        <p className="note" style={{ marginTop: "8px" }}>
          {user
            ? "Your financial data is strictly encrypted and synced exclusively to your private account across devices."
            : "Sign in to back up and sync your ledger securely across your phone, tablet, and laptop."}
        </p>
      </section>

      {/* 3. JSON File Backup & Restore */}
      <section>
        <h2>JSON File Backup &amp; Restore</h2>
        <p className="note">
          Download a full `.json` snapshot to save in your Google Drive or local files anytime, or restore from a previous backup.
        </p>
        <div className="acts">
          <button className="btn" onClick={exportData}>Save JSON backup</button>
          <button className="btn sec" onClick={() => inpRef.current?.click()}>Restore JSON</button>
        </div>
        <input ref={inpRef} type="file" accept=".json,application/json" hidden onChange={importData} />
      </section>

      {/* 4. Currency Selector */}
      <section>
        <h2>Currency</h2>
        <p className="note">Choose your primary display currency.</p>
        <select value={S.cur} onChange={(e) => updateState({ ...S, cur: e.target.value })}>
          {["INR", "USD", "EUR", "GBP", "AED"].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </section>

      {/* 5. Mobile PWA Installation */}
      <section>
        <h2>Use on iPhone &amp; Android</h2>
        <p className="note" style={{ lineHeight: 1.5 }}>
          Open this page in Safari or Chrome, tap <b>Share / Menu</b>, then select <b>“Add to Home Screen”</b>. It installs like a native app and works offline with instant load times.
        </p>
      </section>

      {/* 6. Danger Zone */}
      <section style={{ border: "1px solid var(--out-border)", background: "var(--card)" }}>
        <h2 style={{ color: "var(--out)" }}>Danger Zone</h2>
        <p className="note" style={{ marginBottom: "14px" }}>
          Permanently delete all accounts, credit cards, and transactions on this device.
        </p>
        <button className="btn del" onClick={wipeAll} style={{ width: "100%" }}>
          Delete all data
        </button>
      </section>
    </>
  );
}
