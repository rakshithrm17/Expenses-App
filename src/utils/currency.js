import { KINDS, getCat } from "../constants/config.js";

// Strict integer Paise math to guarantee zero floating-point errors
export const toPaise = (v) => {
  const num = typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
};
export const fromPaise = (p) => Math.round(p) / 100;
export const safeMoney = (v) => fromPaise(toPaise(v));
export const safeAdd = (a, b) => fromPaise(toPaise(a) + toPaise(b));
export const safeSub = (a, b) => fromPaise(toPaise(a) - toPaise(b));
export const safeMul = (a, n) => fromPaise(toPaise(a) * Number(n));

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const ym = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
export const ymd = (d) => ym(d) + "-" + String(d.getDate()).padStart(2, "0");

export const mi = (m) => {
  const [y, o] = m.split("-").map(Number);
  return { y, o, n: new Date(y, o, 0).getDate() };
};

export const mname = (m) => {
  const { y, o } = mi(m);
  return new Date(y, o - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export const shift = (m, k) => {
  const { y, o } = mi(m);
  return ym(new Date(y, o - 1 + k, 1));
};

export const fmt = (n, cur = "INR") => {
  const clean = safeMoney(n);
  const hasDecimals = toPaise(clean) % 100 !== 0;
  return new Intl.NumberFormat(cur === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).format(clean);
};

export const getAcc = (accounts, id) => accounts.find((a) => a.id === id) || { name: "Deleted account" };
export const sumv = (o) => Object.values(o).reduce((a, b) => safeAdd(a, b), 0);

export function occ(t, m) {
  const s = t.date.slice(0, 7);
  if (!t.repeat) return s === m ? 1 : 0;
  return s > m || (t.until && m > t.until) ? 0 : 1;
}

export function occTo(t, m) {
  const s = t.date.slice(0, 7);
  if (s > m) return 0;
  if (!t.repeat) return 1;
  const e = t.until && t.until < m ? t.until : m;
  if (e < s) return 0;
  const a = mi(s), b = mi(e);
  return (b.y - a.y) * 12 + b.o - a.o + 1;
}

export const dayOf = (t, m) => Math.min(+t.date.slice(8, 10), mi(m).n);

export function eff(t) {
  if (t.skipAcct) return [];
  const amt = safeMoney(t.amount);
  if (t.type === "income") return [[t.acct, amt]];
  if (t.type === "expense") return [[t.acct, -amt]];
  if (t.type === "transfer") return [[t.acct, -amt], [t.to, amt]];
  return [[t.acct, KINDS[t.kind]?.in ? amt : -amt]];
}

export function sign(t) {
  if (t.skipAcct || t.type === "transfer") return 0;
  const effects = eff(t);
  return effects.length && effects[0][1] > 0 ? 1 : -1;
}

export function txTitle(t) {
  const p = t.person || "";
  if (t.type === "income") return t.note || "Income";
  if (t.type === "expense") return t.note || getCat(t.cat).n;
  if (t.type === "transfer") return "Transfer";
  return {
    borrow: "Borrowed from " + p,
    repay: "Paid back " + p,
    lend: "Lent to " + p,
    collect: p + " paid back",
    hold: "Keeping for " + p,
    hand: "Returned to " + p
  }[t.kind];
}

export function txSub(t, accounts) {
  const tag = t.skipAcct ? " · past record" : "";
  if (t.type === "income") return getAcc(accounts, t.acct).name + tag + (t.repeat ? " · monthly" : "");
  if (t.type === "expense") return getCat(t.cat).n + " · " + getAcc(accounts, t.acct).name + tag + (t.repeat ? " · monthly" : "");
  if (t.type === "transfer") return getAcc(accounts, t.acct).name + " → " + getAcc(accounts, t.to).name;
  return getAcc(accounts, t.acct).name + tag + (t.note ? " · " + t.note : "");
}

export function calc(S) {
  const now = ym(new Date());
  const bal = {}, held = {}, lent = {}, owe = {}, P = {};
  S.accounts.forEach((a) => {
    bal[a.id] = safeMoney(a.open);
    held[a.id] = 0;
    lent[a.id] = 0;
    owe[a.id] = 0;
  });

  for (const t of S.txs) {
    const n = occTo(t, now);
    if (!n) continue;
    for (const [a, d] of eff(t)) {
      if (a in bal) bal[a] = safeAdd(bal[a], safeMul(d, n));
    }
    if (t.type === "people" && t.person) {
      const k = t.person.trim().toLowerCase();
      const v = safeMul(t.amount, n);
      const p = (P[k] = P[k] || { name: t.person.trim(), owe: 0, owed: 0, held: 0 });
      if (t.kind === "borrow") {
        p.owe = safeAdd(p.owe, v);
        if (t.acct in owe) owe[t.acct] = safeAdd(owe[t.acct], v);
      }
      if (t.kind === "repay") {
        p.owe = safeSub(p.owe, v);
        if (t.acct in owe) owe[t.acct] = safeSub(owe[t.acct], v);
      }
      if (t.kind === "lend") {
        p.owed = safeAdd(p.owed, v);
        if (t.acct in lent) lent[t.acct] = safeAdd(lent[t.acct], v);
      }
      if (t.kind === "collect") {
        p.owed = safeSub(p.owed, v);
        if (t.acct in lent) lent[t.acct] = safeSub(lent[t.acct], v);
      }
      if (t.kind === "hold") {
        p.held = safeAdd(p.held, v);
        if (t.acct in held) held[t.acct] = safeAdd(held[t.acct], v);
      }
      if (t.kind === "hand") {
        p.held = safeSub(p.held, v);
        if (t.acct in held) held[t.acct] = safeSub(held[t.acct], v);
      }
    }
  }
  return { bal, held, lent, owe, P };
}

export function stats(S, m) {
  const o = { tin: 0, spent: 0, saved: 0, byCat: {}, byAcct: {}, inc: {}, rows: [] };
  for (const t of S.txs) {
    if (!occ(t, m)) continue;
    o.rows.push(t);
    const amt = safeMoney(t.amount);
    if (t.type === "income") {
      o.tin = safeAdd(o.tin, amt);
      const k = t.note || "Income";
      o.inc[k] = safeAdd(o.inc[k] || 0, amt);
    }
    if (t.type === "expense") {
      o.byCat[t.cat] = safeAdd(o.byCat[t.cat] || 0, amt);
      if (getCat(t.cat).sv) {
        o.saved = safeAdd(o.saved, amt);
      } else {
        o.spent = safeAdd(o.spent, amt);
        o.byAcct[t.acct] = safeAdd(o.byAcct[t.acct] || 0, amt);
      }
    }
  }
  o.left = safeSub(safeSub(o.tin, o.spent), o.saved);
  return o;
}

export function getPersonDebtInfo(S, personName, editingTxId = null) {
  if (!personName || !personName.trim()) return null;
  const k = personName.trim().toLowerCase();
  const c = calc(S);
  const p = c.P[k];

  let baseOwed = p ? p.owed : 0;
  let baseOwe = p ? p.owe : 0;
  let baseHeld = p ? p.held : 0;

  if (editingTxId) {
    const tx = S.txs.find((x) => x.id === editingTxId);
    if (tx && tx.type === "people" && tx.person && tx.person.trim().toLowerCase() === k) {
      const amt = safeMoney(tx.amount);
      if (tx.kind === "collect") baseOwed = safeAdd(baseOwed, amt);
      if (tx.kind === "repay") baseOwe = safeAdd(baseOwe, amt);
      if (tx.kind === "hand") baseHeld = safeAdd(baseHeld, amt);
      if (tx.kind === "lend") baseOwed = safeSub(baseOwed, amt);
      if (tx.kind === "borrow") baseOwe = safeSub(baseOwe, amt);
      if (tx.kind === "hold") baseHeld = safeSub(baseHeld, amt);
    }
  }

  return {
    name: p ? p.name : personName.trim(),
    owed: Math.max(0, baseOwed),
    owe: Math.max(0, baseOwe),
    held: Math.max(0, baseHeld)
  };
}

export function checkClearance(baseAmt, enteredAmt) {
  const baseP = toPaise(baseAmt);
  const entP = toPaise(enteredAmt);
  if (entP <= 0) {
    return { type: "none", remaining: baseAmt };
  }
  const remP = baseP - entP;
  if (remP === 0) {
    return { type: "cleared", remaining: 0 };
  }
  if (remP > 0) {
    return { type: "partial", remaining: fromPaise(remP) };
  }
  return { type: "overpaid", overpaid: fromPaise(-remP), remaining: 0 };
}

export function getActiveDebtors(S, kind, editingTxId = null) {
  const c = calc(S);
  const list = [];
  const editingTx = editingTxId ? S.txs.find((x) => x.id === editingTxId) : null;
  const editPersonKey = editingTx?.person?.trim().toLowerCase();

  for (const [k, p] of Object.entries(c.P)) {
    let val = 0;
    if (kind === "collect") val = p.owed;
    else if (kind === "repay") val = p.owe;
    else if (kind === "hand") val = p.held;

    if (editingTx && editPersonKey === k && editingTx.kind === kind) {
      val = safeAdd(val, safeMoney(editingTx.amount));
    }

    if (val > 0.005) {
      list.push({ key: k, name: p.name, amount: val });
    }
  }
  return list.sort((a, b) => b.amount - a.amount);
}

export function getCardDetails(card, S, c) {
  const b = c.bal[card.id] || 0;
  // If balance is negative, that is the outstanding liability/debt to the bank
  const debt = b < 0 ? Math.abs(b) : 0;
  const limit = safeMoney(card.limit || 0);
  const available = Math.max(0, safeAdd(limit, b));
  const utilization = limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;

  // Payments made into this card via Transfer:
  const payments = (S.txs || []).filter(
    (t) => t.type === "transfer" && t.to === card.id && !t.skipAcct
  );
  const totalPaid = payments.reduce((acc, t) => safeAdd(acc, t.amount), 0);

  const initialBilled = safeMoney(card.billedAmt || 0);
  const remainingBilled = Math.min(debt, Math.max(0, safeSub(initialBilled, totalPaid)));
  const unbilled = Math.max(0, safeSub(debt, remainingBilled));

  return {
    debt,
    limit,
    available,
    utilization,
    initialBilled,
    totalPaid,
    remainingBilled,
    unbilled,
    billDay: Number(card.billDay) || 1,
    dueDay: Number(card.dueDay) || 1,
    cardType: card.cardType || "normal",
    isCleared: debt <= 0.005 || remainingBilled <= 0.005
  };
}
