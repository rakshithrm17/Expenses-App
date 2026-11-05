import React, { useState, useEffect } from "react";
import { CATS, KINDS } from "../constants/config";
import { ym, ymd, uid, safeMoney, calc, txTitle, sign, fmt } from "../utils/currency";

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
      setAcctForm({ id: modal.id || "", name: a.name, open: a.open });
    }
  }, [modal, S, M]);

  if (!modal) return <div id="scrim" />;

  if (modal.mode === "person") {
    const k = modal.personKey;
    const p = calc(S).P[k];
    if (!p) return null;
    const hist = S.txs
      .filter((t) => t.type === "people" && t.person.trim().toLowerCase() === k)
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div id="scrim" className="on" onClick={(e) => e.target.id === "scrim" && closeSheet()}>
        <div id="sheet">
          <h3>{p.name}</h3>
          <div>
            {p.owe > 0.005 && <div className="out">You owe {fmt(p.owe, S.cur)}</div>}
            {p.owed > 0.005 && <div className="in">Owes you {fmt(p.owed, S.cur)}</div>}
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
              <span className="t"><div>{txTitle(t)}</div><small>{t.date}</small></span>
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
      const o = { id: acctForm.id || uid(), name: n, open: safeMoney(acctForm.open) };
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
          <label>{acctForm.id ? "Opening balance (before the entries you added)" : "Balance right now"}</label>
          <input inputMode="decimal" value={acctForm.open} onChange={(e) => setAcctForm({ ...acctForm, open: e.target.value })} placeholder="0" />
          <div className="acts">
            {acctForm.id ? <button className="btn del" onClick={delAcct}>Delete</button> : <button className="btn sec" onClick={closeSheet}>Cancel</button>}
            <button className="btn" onClick={saveAcct}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  if (!D) return null;
  const names = [...new Set(S.txs.filter((x) => x.type === "people").map((x) => x.person.trim()))];

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
      note: (D.note || "").trim()
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

        <label>Amount</label>
        <input inputMode="decimal" value={D.amount} onChange={(e) => setD({ ...D, amount: e.target.value })} placeholder="0" />

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
            <label>Person</label>
            <input list="pl" value={D.person} onChange={(e) => setD({ ...D, person: e.target.value })} placeholder="Name" />
            <datalist id="pl">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <label>{KINDS[D.kind]?.in ? "Money came into" : "Money went out of"}</label>
            <select value={D.acct} onChange={(e) => setD({ ...D, acct: e.target.value })}>
              {S.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
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
