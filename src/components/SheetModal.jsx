import React, { useState, useEffect } from "react";
import { CATS, KINDS } from "../constants/config";
import {
  ym,
  ymd,
  uid,
  safeMoney,
  calc,
  txTitle,
  sign,
  fmt,
  getAcc,
  safeAdd,
  safeSub,
  safeMul,
  occTo,
  eff,
  getPersonDebtInfo,
  checkClearance,
  getActiveDebtors
} from "../utils/currency";

export default function SheetModal({ modal, closeSheet, S, M, setM, tab, updateState, setModal }) {
  const [D, setD] = useState(null);
  const [acctForm, setAcctForm] = useState({ id: "", name: "", open: "" });

  useEffect(() => {
    if (!modal) return;
    if (modal.mode === "tx") {
      const t = modal.id && S.txs.find((x) => x.id === modal.id);
      const a = S.accounts;
      setD(
        t
          ? { ...t }
          : {
              id: "", type: "expense", amount: "",
              date: M === ym(new Date()) ? ymd(new Date()) : M + "-01",
              acct: a[0].id, to: (a[1] || a[0]).id, cat: "groc",
              kind: "borrow", person: "", note: "", repeat: false, until: "",
              ...(modal.pre || {})
            }
      );
    } else if (modal.mode === "acct") {
      const a = S.accounts.find((x) => x.id === modal.id) || { name: "", open: "" };
      const c = calc(S);
      const curVal = modal.id && modal.id in c.bal ? c.bal[modal.id] : a.open;
      setAcctForm({ id: modal.id || "", name: a.name, open: curVal });
    }
  }, [modal, S, M]);

  if (!modal) return <div id="scrim" />;

  if (modal.mode === "source") {
    const id = modal.id;
    const a = S.accounts.find((x) => x.id === id) || { name: "" };
    const c = calc(S);
    const b = c.bal[id] || 0;
    const h = c.held[id] || 0;
    const l = c.lent[id] || 0;
    const o = c.owe[id] || 0;
    const myMoney = safeSub(safeAdd(b, l), safeAdd(h, o));

    const heldMap = {};
    const lentMap = {};
    for (const t of S.txs) {
      if (t.type === "people" && t.acct === id && t.person) {
        const k = t.person.trim();
        const amt = safeMoney(t.amount);
        if (t.kind === "hold") heldMap[k] = safeAdd(heldMap[k] || 0, amt);
        if (t.kind === "hand") heldMap[k] = safeSub(heldMap[k] || 0, amt);
        if (t.kind === "lend") lentMap[k] = safeAdd(lentMap[k] || 0, amt);
        if (t.kind === "collect") lentMap[k] = safeSub(lentMap[k] || 0, amt);
      }
    }

    const heldList = Object.entries(heldMap)
      .filter(([, v]) => v > 0.005)
      .map(([person, amount]) => ({ person, amount }));
    const lentList = Object.entries(lentMap)
      .filter(([, v]) => v > 0.005)
      .map(([person, amount]) => ({ person, amount }));

    const heldPeopleStr = heldList.map((x) => `${x.person} (${fmt(x.amount, S.cur)})`).join(", ");
    const lentPeopleStr = lentList.map((x) => `${x.person} (${fmt(x.amount, S.cur)})`).join(", ");

    let shortageBlock = null;
    if (h > 0.005) {
      if (b >= h) {
        shortageBlock = (
          <div style={{
            background: "rgba(11,122,99,0.08)",
            border: "1px solid var(--in)",
            borderRadius: "10px",
            padding: "11px 13px",
            marginTop: "12px",
            fontSize: "13.5px",
            color: "var(--in)",
            lineHeight: 1.4
          }}>
            <b>✓ No cash shortage</b><br />
            Your cash balance ({fmt(b, S.cur)}) fully covers all {fmt(h, S.cur)} kept for others.
          </div>
        );
      } else {
        const totalShortage = safeSub(h, Math.max(0, b));
        let remCash = Math.max(0, b);
        const parts = [];
        for (const item of heldList) {
          const covered = Math.min(remCash, item.amount);
          const shortage = safeSub(item.amount, covered);
          remCash = safeSub(remCash, covered);
          if (shortage > 0.005) {
            parts.push(`${item.person} (short by ${fmt(shortage, S.cur)})`);
          }
        }
        shortageBlock = (
          <div style={{
            background: "rgba(200,69,31,0.08)",
            border: "1.5px solid var(--out)",
            borderRadius: "10px",
            padding: "12px 14px",
            marginTop: "12px",
            fontSize: "13.5px",
            color: "var(--out)"
          }}>
            <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>
              ⚠️ Cash shortage: {fmt(totalShortage, S.cur)}
            </div>
            <div style={{ color: "var(--ink)", lineHeight: 1.4 }}>
              Balance is <b>{fmt(b, S.cur)}</b>. Still you need <b>{fmt(totalShortage, S.cur)}</b> to give back: {parts.join(", ")}.
            </div>
            {l > 0.005 && (
              <div style={{ marginTop: "6px", fontSize: "12.5px", color: "var(--ink)", opacity: 0.9 }}>
                Once {fmt(l, S.cur)} lent to {lentList.map((x) => x.person).join(", ")} is collected, your shortage will be cleared with {fmt(myMoney, S.cur)} left for you.
              </div>
            )}
          </div>
        );
      }
    }

    return (
      <div id="scrim" className="on" onClick={(e) => e.target.id === "scrim" && closeSheet()}>
        <div id="sheet">
          <h3>{a.name} Breakdown</h3>
          <div style={{ background: "var(--bg)", borderRadius: "12px", padding: "14px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span>Cash balance in account:</span>
              <b>{fmt(b, S.cur)}</b>
            </div>
            {h > 0.005 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--out)", marginBottom: "8px" }}>
                <span>
                  Someone’s money kept (RED):<br />
                  <small>{heldPeopleStr || "Kept for others"}</small>
                </span>
                <b>− {fmt(h, S.cur)}</b>
              </div>
            )}
            {l > 0.005 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--in)", marginBottom: "8px" }}>
                <span>
                  Money you lent (to come back):<br />
                  <small>{lentPeopleStr || "Pending loans"}</small>
                </span>
                <b>+ {fmt(l, S.cur)}</b>
              </div>
            )}
            {o > 0.005 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--out)", marginBottom: "8px" }}>
                <span>You owe from here:</span>
                <b>− {fmt(o, S.cur)}</b>
              </div>
            )}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1.5px solid var(--line)",
              paddingTop: "10px",
              fontSize: "17px"
            }}>
              <span><b>Your actual money here:</b></span>
              <b className={myMoney >= 0 ? "in" : "out"}>{fmt(myMoney, S.cur)}</b>
            </div>
            {shortageBlock}
          </div>
          <div className="acts">
            <button className="btn" onClick={() => setModal({ mode: "acct", id })}>
              Edit / Calibrate balance
            </button>
            <button className="btn sec" onClick={closeSheet}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modal.mode === "person") {
    const k = modal.personKey;
    const p = calc(S).P[k];
    if (!p) return null;
    const hist = S.txs
      .filter((t) => t.type === "people" && t.person && t.person.trim().toLowerCase() === k)
      .sort((a, b) => b.date.localeCompare(a.date));

    const isSettled = p.owe <= 0.005 && p.owed <= 0.005 && p.held <= 0.005;
    const totalLent = hist.filter((t) => t.kind === "lend").reduce((acc, t) => safeAdd(acc, t.amount), 0);
    const totalCollected = hist.filter((t) => t.kind === "collect").reduce((acc, t) => safeAdd(acc, t.amount), 0);

    return (
      <div id="scrim" className="on" onClick={(e) => e.target.id === "scrim" && closeSheet()}>
        <div id="sheet">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3 style={{ margin: 0 }}>{p.name}</h3>
            {isSettled && (
              <span style={{ fontSize: "12px", background: "rgba(11,122,99,0.12)", color: "var(--in)", padding: "4px 8px", borderRadius: "6px", fontWeight: 600 }}>
                ✓ Settled & Cleared
              </span>
            )}
          </div>
          <div>
            {p.owe > 0.005 && <div className="out">You owe {fmt(p.owe, S.cur)}</div>}
            {p.owed > 0.005 && (
              <div className="in">
                Owes you {fmt(p.owed, S.cur)}
                {totalCollected > 0 && (
                  <small style={{ display: "block", color: "#D9822B", fontWeight: 500, marginTop: "2px" }}>
                    Partially cleared ({fmt(totalCollected, S.cur)} paid back of {fmt(totalLent, S.cur)})
                  </small>
                )}
              </div>
            )}
            {p.held > 0.005 && <div>You are keeping {fmt(p.held, S.cur)} for them</div>}
          </div>
          <div className="acts" style={{ flexWrap: "wrap" }}>
            {p.owe > 0.005 && (
              <button className="btn" onClick={() => setModal({ mode: "tx", id: "", pre: { type: "people", kind: "repay", person: p.name, amount: p.owe } })}>
                Pay back
              </button>
            )}
            {p.owed > 0.005 && (
              <button className="btn" onClick={() => setModal({ mode: "tx", id: "", pre: { type: "people", kind: "collect", person: p.name, amount: p.owed } })}>
                Got paid back
              </button>
            )}
            {p.held > 0.005 && (
              <button className="btn" onClick={() => setModal({ mode: "tx", id: "", pre: { type: "people", kind: "hand", person: p.name, amount: p.held } })}>
                Hand back
              </button>
            )}
            <button className="btn sec" onClick={() => setModal({ mode: "tx", id: "", pre: { type: "people", person: p.name } })}>
              New entry
            </button>
          </div>
          <h2 style={{ marginTop: "20px" }}>History</h2>
          {hist.map((t) => (
            <button key={t.id} className="row" onClick={() => setModal({ mode: "tx", id: t.id })}>
              <span className="t">
                <div>{txTitle(t)}</div>
                <small>{t.date} · {getAcc(S.accounts, t.acct).name}</small>
              </span>
              <span className={`a ${sign(t) > 0 ? "in" : "out"}`}>{sign(t) > 0 ? "+" : "−"}{fmt(t.amount, S.cur)}</span>
            </button>
          ))}
          <div className="acts"><button className="btn sec" onClick={closeSheet}>Close</button></div>
        </div>
      </div>
    );
  }

  if (modal.mode === "acct") {
    const saveAcct = () => {
      const n = acctForm.name.trim();
      if (!n) return;
      const targetBal = safeMoney(acctForm.open);
      let openVal = targetBal;
      if (acctForm.id) {
        const now = ym(new Date());
        let txSum = 0;
        for (const t of S.txs) {
          const n = occTo(t, now);
          if (!n) continue;
          for (const [a, d] of eff(t)) {
            if (a === acctForm.id) txSum = safeAdd(txSum, safeMul(d, n));
          }
        }
        openVal = safeSub(targetBal, txSum);
      }
      const o = { id: acctForm.id || uid(), name: n, open: openVal };
      const next = [...S.accounts];
      const idx = next.findIndex((x) => x.id === o.id);
      if (idx >= 0) next[idx] = o;
      else next.push(o);
      updateState({ ...S, accounts: next });
      closeSheet();
    };

    const delAcct = () => {
      if (S.accounts.length < 2) return alert("Keep at least one account.");
      if (S.txs.some((t) => t.acct === acctForm.id || t.to === acctForm.id)) {
        return alert("This account has entries. Delete or edit those first.");
      }
      updateState({ ...S, accounts: S.accounts.filter((a) => a.id !== acctForm.id) });
      closeSheet();
    };

    return (
      <div id="scrim" className="on" onClick={(e) => e.target.id === "scrim" && closeSheet()}>
        <div id="sheet">
          <h3>{acctForm.id ? "Edit account" : "New account"}</h3>
          <label>Name</label>
          <input value={acctForm.name} onChange={(e) => setAcctForm({ ...acctForm, name: e.target.value })} placeholder="HDFC, BOB, Karnataka Bank, Cash…" />
          <label>Balance right now (in your bank/cash today)</label>
          <input inputMode="decimal" value={acctForm.open} onChange={(e) => setAcctForm({ ...acctForm, open: e.target.value })} placeholder="0" />
          <p className="note">Enter what is actually in this account today. It automatically calibrates your balance to match reality.</p>
          <div className="acts">
            {acctForm.id ? <button className="btn del" onClick={delAcct}>Delete</button> : <button className="btn sec" onClick={closeSheet}>Cancel</button>}
            <button className="btn" onClick={saveAcct}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  if (!D) return null;
  const names = [...new Set(S.txs.filter((x) => x.type === "people" && x.person).map((x) => x.person.trim()))];

  const activeDebtors = D.type === "people" ? getActiveDebtors(S, D.kind, D.id) : [];
  const debtInfo = D.type === "people" && D.person ? getPersonDebtInfo(S, D.person, D.id) : null;
  const targetDebt = debtInfo
    ? D.kind === "collect"
      ? debtInfo.owed
      : D.kind === "repay"
      ? debtInfo.owe
      : D.kind === "hand"
      ? debtInfo.held
      : 0
    : 0;

  let clearanceFeedback = null;
  if (D.type === "people" && D.person && D.amount) {
    if (targetDebt > 0 && (D.kind === "collect" || D.kind === "repay" || D.kind === "hand")) {
      const clr = checkClearance(targetDebt, D.amount);
      if (clr.type === "cleared") {
        clearanceFeedback = {
          icon: "✓",
          text: D.kind === "collect"
            ? `Fully clears ${debtInfo.name}'s debt`
            : D.kind === "repay"
            ? `Fully clears your debt to ${debtInfo.name}`
            : `Fully returns kept money to ${debtInfo.name}`,
          bg: "rgba(11, 122, 99, 0.12)",
          color: "var(--in)",
          border: "rgba(11, 122, 99, 0.25)"
        };
      } else if (clr.type === "partial") {
        clearanceFeedback = {
          icon: "⚠️",
          text: `Partially cleared — ${fmt(clr.remaining, S.cur)} still remaining`,
          bg: "rgba(217, 130, 43, 0.12)",
          color: "#D9822B",
          border: "rgba(217, 130, 43, 0.25)"
        };
      } else if (clr.type === "overpaid") {
        clearanceFeedback = {
          icon: "ℹ️",
          text: `Overpayment of ${fmt(clr.overpaid, S.cur)}`,
          bg: "rgba(200, 69, 31, 0.12)",
          color: "var(--out)",
          border: "rgba(200, 69, 31, 0.25)"
        };
      }
    } else if (D.kind === "lend" && debtInfo && debtInfo.owed > 0) {
      const newTotal = safeAdd(debtInfo.owed, D.amount);
      clearanceFeedback = {
        icon: "ℹ️",
        text: `${debtInfo.name} already owes ${fmt(debtInfo.owed, S.cur)}. New total: ${fmt(newTotal, S.cur)}`,
        bg: "rgba(63, 108, 143, 0.12)",
        color: "#3F6C8F",
        border: "rgba(63, 108, 143, 0.25)"
      };
    }
  }

  const saveTx = () => {
    const amt = safeMoney(D.amount);
    if (amt <= 0) return;
    if (D.type === "people" && !D.person.trim()) return;
    if (D.type === "transfer" && D.acct === D.to) return alert("Pick two different accounts.");

    const o = {
      id: D.id || uid(),
      type: D.type,
      amount: amt,
      date: D.date || ymd(new Date()),
      acct: D.acct,
      note: (D.note || "").trim(),
      skipAcct: !!D.skipAcct
    };
    if (D.type === "expense") o.cat = D.cat;
    if (D.type === "transfer") o.to = D.to;
    if (D.type === "people") {
      o.kind = D.kind;
      o.person = D.person.trim();
    }
    if (D.type === "expense" || D.type === "income") {
      o.repeat = !!D.repeat;
      o.until = D.repeat ? D.until : "";
    }

    const next = [...S.txs];
    const i = next.findIndex((x) => x.id === o.id);
    if (i >= 0) next[i] = o;
    else next.push(o);

    if (!o.repeat && (tab === "o" || tab === "a")) setM(o.date.slice(0, 7));
    updateState({ ...S, txs: next });
    closeSheet();
  };

  const delTx = () => {
    updateState({ ...S, txs: S.txs.filter((x) => x.id !== D.id) });
    closeSheet();
  };

  return (
    <div id="scrim" className="on" onClick={(e) => e.target.id === "scrim" && closeSheet()}>
      <div id="sheet">
        <h3>{D.id ? "Edit entry" : "New entry"}</h3>
        <div className="seg">
          {[
            ["expense", "Expense"],
            ["income", "Income"],
            ["transfer", "Transfer"],
            ["people", "People"]
          ].map(([k, l]) => (
            <button key={k} type="button" className={D.type === k ? "on" : ""} onClick={() => setD({ ...D, type: k })}>
              {l}
            </button>
          ))}
        </div>

        {D.type !== "people" && (
          <>
            <label>Amount</label>
            <input inputMode="decimal" value={D.amount} onChange={(e) => setD({ ...D, amount: e.target.value })} placeholder="0" />
          </>
        )}

        {D.type === "expense" && (
          <>
            <label>Category</label>
            <select value={D.cat} onChange={(e) => setD({ ...D, cat: e.target.value })}>
              {CATS.map((c) => (
                <option key={c.id} value={c.id}>{c.n}</option>
              ))}
            </select>
            <label>Paid from</label>
            <select value={D.acct} onChange={(e) => setD({ ...D, acct: e.target.value })}>
              {S.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <label>Note (optional)</label>
            <input value={D.note} onChange={(e) => setD({ ...D, note: e.target.value })} placeholder="e.g. Rent, Swiggy, petrol" />
          </>
        )}

        {D.type === "income" && (
          <>
            <label>What is it?</label>
            <input value={D.note} onChange={(e) => setD({ ...D, note: e.target.value })} placeholder="Salary, business, interest…" />
            <div className="chips">
              {["Salary", "Business", "Interest", "Other"].map((n) => (
                <button key={n} type="button" onClick={() => setD({ ...D, note: n })}>{n}</button>
              ))}
            </div>
            <label>Received in</label>
            <select value={D.acct} onChange={(e) => setD({ ...D, acct: e.target.value })}>
              {S.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <label><b>Income type</b></label>
            <div className="seg" style={{ marginTop: "6px", marginBottom: "6px" }}>
              <button
                type="button"
                className={!D.skipAcct ? "on" : ""}
                onClick={() => setD({ ...D, skipAcct: false })}
              >
                + New incoming money
              </button>
              <button
                type="button"
                className={D.skipAcct ? "on" : ""}
                onClick={() => setD({ ...D, skipAcct: true })}
              >
                Old record (keep balance)
              </button>
            </div>
            <p className="note" style={{ margin: "2px 0 10px" }}>
              {D.skipAcct
                ? "Keeps account balance as is. Just logs this income in stats."
                : "Adds this amount (+) to your account balance."}
            </p>
          </>
        )}

        {D.type === "transfer" && (
          <>
            <label>From</label>
            <select value={D.acct} onChange={(e) => setD({ ...D, acct: e.target.value })}>
              {S.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <label>To</label>
            <select value={D.to} onChange={(e) => setD({ ...D, to: e.target.value })}>
              {S.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <label>Note (optional)</label>
            <input value={D.note} onChange={(e) => setD({ ...D, note: e.target.value })} />
          </>
        )}

        {D.type === "people" && (
          <>
            <label>What happened?</label>
            <select value={D.kind} onChange={(e) => setD({ ...D, kind: e.target.value })}>
              {Object.entries(KINDS).map(([k, v]) => (
                <option key={k} value={k}>{v.l}</option>
              ))}
            </select>

            {activeDebtors.length > 0 && (D.kind === "collect" || D.kind === "repay" || D.kind === "hand") && (
              <>
                <label>
                  {D.kind === "collect"
                    ? "Select person who owes you"
                    : D.kind === "repay"
                    ? "Select person you owe"
                    : "Select person holding money for"}
                </label>
                <select
                  value={activeDebtors.some((d) => d.name.toLowerCase() === (D.person || "").trim().toLowerCase()) ? (activeDebtors.find((d) => d.name.toLowerCase() === (D.person || "").trim().toLowerCase())?.name || "") : ""}
                  onChange={(e) => {
                    const selName = e.target.value;
                    if (selName) {
                      setD((prev) => ({ ...prev, person: selName }));
                    }
                  }}
                >
                  <option value="">
                    -- Choose active contact ({activeDebtors.length}) --
                  </option>
                  {activeDebtors.map((d) => (
                    <option key={d.key} value={d.name}>
                      {d.name} ({D.kind === "collect" ? "Owes " : D.kind === "repay" ? "You owe " : "Holding "}{fmt(d.amount, S.cur)})
                    </option>
                  ))}
                </select>
              </>
            )}

            <label>Person {activeDebtors.length > 0 && (D.kind === "collect" || D.kind === "repay" || D.kind === "hand") ? "(or enter name)" : ""}</label>
            <input list="pl" value={D.person} onChange={(e) => setD({ ...D, person: e.target.value })} placeholder="Name" />
            <datalist id="pl">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>

            {debtInfo && targetDebt > 0 && (D.kind === "collect" || D.kind === "repay" || D.kind === "hand") && (
              <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card)", padding: "8px 12px", borderRadius: "10px", border: "1.5px solid var(--line)" }}>
                <span style={{ fontSize: "13px" }}>
                  {D.kind === "collect" ? "Currently owes: " : D.kind === "repay" ? "You owe: " : "Holding: "}
                  <b>{fmt(targetDebt, S.cur)}</b>
                </span>
                <button
                  type="button"
                  className="btn sec"
                  style={{ padding: "4px 10px", fontSize: "12px", borderRadius: "14px" }}
                  onClick={() => setD((prev) => ({ ...prev, amount: targetDebt.toString() }))}
                >
                  Pay full {fmt(targetDebt, S.cur)}
                </button>
              </div>
            )}

            <label>Amount</label>
            <input inputMode="decimal" value={D.amount} onChange={(e) => setD({ ...D, amount: e.target.value })} placeholder="0" />

            {clearanceFeedback && (
              <div style={{
                marginTop: "6px",
                padding: "8px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
                background: clearanceFeedback.bg,
                color: clearanceFeedback.color,
                border: `1px solid ${clearanceFeedback.border}`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{clearanceFeedback.icon}</span>
                  <span>{clearanceFeedback.text}</span>
                </div>
                <span style={{ fontSize: "11.5px", fontWeight: 500, opacity: 0.9 }}>
                  {KINDS[D.kind]?.in ? "Deposits into: " : "Paid from: "}
                  <b>{getAcc(S.accounts, D.acct).name}</b>
                </span>
              </div>
            )}

            <label>{KINDS[D.kind]?.in ? "Money came into" : "Money went out of"}</label>
            <select value={D.acct} onChange={(e) => setD({ ...D, acct: e.target.value })}>
              {S.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <label><b>Transaction type</b></label>
            <div className="seg" style={{ marginTop: "6px", marginBottom: "6px" }}>
              <button
                type="button"
                className={!D.skipAcct ? "on" : ""}
                onClick={() => setD({ ...D, skipAcct: false })}
              >
                {KINDS[D.kind]?.in ? "+ New incoming (adds)" : "− Live payment (deducts)"}
              </button>
              <button
                type="button"
                className={D.skipAcct ? "on" : ""}
                onClick={() => setD({ ...D, skipAcct: true })}
              >
                Old record (keep balance)
              </button>
            </div>
            <p className="note" style={{ margin: "2px 0 10px" }}>
              {D.skipAcct
                ? "Keeps current account balance as is. Just saves the record to track who owes what."
                : KINDS[D.kind]?.in
                ? "Adds this amount (+) to your account balance."
                : "Deducts this amount (−) from your account balance."}
            </p>
            <label>Note (optional)</label>
            <input value={D.note} onChange={(e) => setD({ ...D, note: e.target.value })} placeholder="e.g. for medical, 2 months" />
          </>
        )}

        <label>Date</label>
        <input type="date" value={D.date} onChange={(e) => setD({ ...D, date: e.target.value })} />

        {(D.type === "expense" || D.type === "income") && (
          <>
            <label className="chk">
              <input type="checkbox" checked={!!D.repeat} onChange={(e) => setD({ ...D, repeat: e.target.checked })} />
              Repeats every month
            </label>
            {D.repeat && (
              <div>
                <label>Last month it counts (optional)</label>
                <input type="month" value={D.until || ""} onChange={(e) => setD({ ...D, until: e.target.value })} />
              </div>
            )}
          </>
        )}

        <div className="acts">
          {D.id ? <button className="btn del" onClick={delTx}>Delete</button> : <button className="btn sec" onClick={closeSheet}>Cancel</button>}
          <button className="btn" onClick={saveTx}>Save</button>
        </div>
      </div>
    </div>
  );
}
