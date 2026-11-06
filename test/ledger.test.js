import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  toPaise,
  fromPaise,
  safeAdd,
  safeSub,
  safeMul,
  safeMoney,
  calc,
  stats,
  getPersonDebtInfo,
  checkClearance,
  getActiveDebtors
} from "../src/utils/currency.js";

describe("Strict Paise Financial Math", () => {
  test("Zero floating point precision errors", () => {
    // 0.1 + 0.2 in standard JS float is 0.30000000000000004
    assert.equal(safeAdd(0.1, 0.2), 0.3);
    assert.equal(safeSub(0.3, 0.2), 0.1);
    assert.equal(safeAdd("1,000.50", "2,000.25"), 3000.75);
    assert.equal(toPaise("1,234.56"), 123456);
    assert.equal(fromPaise(123456), 1234.56);
  });

  test("Clearance calculation statuses", () => {
    // Full clearance
    const full = checkClearance(5000, 5000);
    assert.equal(full.type, "cleared");
    assert.equal(full.remaining, 0);

    // Partial clearance
    const part = checkClearance(5000, 2000);
    assert.equal(part.type, "partial");
    assert.equal(part.remaining, 3000);

    // Overpayment
    const over = checkClearance(5000, 5500);
    assert.equal(over.type, "overpaid");
    assert.equal(over.overpaid, 500);

    // Empty / 0
    const zero = checkClearance(5000, 0);
    assert.equal(zero.type, "none");
    assert.equal(zero.remaining, 5000);
  });
});

describe("Multi-Account Lent & Repaid Lifecycle (Cash + 2 Banks)", () => {
  const setupState = () => ({
    cur: "INR",
    accounts: [
      { id: "cash", name: "Cash Wallet", open: 10000 },
      { id: "hdfc", name: "HDFC Bank", open: 50000 },
      { id: "sbi", name: "SBI Bank", open: 25000 }
    ],
    txs: [],
    updatedAt: Date.now()
  });

  test("Scenario 1: Single account full loan and full return in Cash", () => {
    const S = setupState();

    // 1. Lent 3,000 in Cash to "Anil"
    S.txs.push({
      id: "tx1",
      type: "people",
      kind: "lend",
      amount: 3000,
      person: "Anil",
      acct: "cash",
      date: "2026-11-01"
    });

    let c = calc(S);
    assert.equal(c.bal["cash"], 7000); // 10000 - 3000
    assert.equal(c.bal["hdfc"], 50000);
    assert.equal(c.bal["sbi"], 25000);
    assert.equal(c.P["anil"].owed, 3000);

    // Active debtors dropdown must list Anil
    let debtors = getActiveDebtors(S, "collect");
    assert.equal(debtors.length, 1);
    assert.equal(debtors[0].name, "Anil");
    assert.equal(debtors[0].amount, 3000);

    // 2. Anil pays back 3,000 in Cash
    S.txs.push({
      id: "tx2",
      type: "people",
      kind: "collect",
      amount: 3000,
      person: "Anil",
      acct: "cash",
      date: "2026-11-02"
    });

    c = calc(S);
    assert.equal(c.bal["cash"], 10000); // Back to full
    assert.equal(c.P["anil"].owed, 0); // Fully cleared

    // Active debtors list should now be empty (Anil is settled)
    debtors = getActiveDebtors(S, "collect");
    assert.equal(debtors.length, 0);
  });

  test("Scenario 2: Multi-account split loan & partial repayments across Cash + HDFC + SBI", () => {
    const S = setupState();
    // Starting total = 10,000 (Cash) + 50,000 (HDFC) + 25,000 (SBI) = 85,000

    // Step 1: Lent 15,000 from HDFC Bank to "Rahul"
    S.txs.push({
      id: "tx-lend-1",
      type: "people",
      kind: "lend",
      amount: 15000,
      person: "Rahul",
      acct: "hdfc",
      date: "2026-11-01"
    });

    let c = calc(S);
    assert.equal(c.bal["hdfc"], 35000, "HDFC balance should decrease by 15,000");
    assert.equal(c.bal["cash"], 10000, "Cash balance unchanged");
    assert.equal(c.bal["sbi"], 25000, "SBI balance unchanged");
    assert.equal(c.P["rahul"].owed, 15000, "Rahul owes 15,000");

    let debtors = getActiveDebtors(S, "collect");
    assert.equal(debtors.length, 1);
    assert.equal(debtors[0].name, "Rahul");
    assert.equal(debtors[0].amount, 15000);

    // Step 2: Partial Repayment 1 - Rahul gives 5,000 back in CASH
    S.txs.push({
      id: "tx-col-1",
      type: "people",
      kind: "collect",
      amount: 5000,
      person: "Rahul",
      acct: "cash",
      date: "2026-11-02"
    });

    c = calc(S);
    assert.equal(c.bal["cash"], 15000, "Cash balance should increase by 5,000 to 15,000");
    assert.equal(c.bal["hdfc"], 35000, "HDFC balance remains 35,000");
    assert.equal(c.bal["sbi"], 25000, "SBI balance remains 25,000");
    assert.equal(c.P["rahul"].owed, 10000, "Rahul should still owe 10,000 (Partial)");

    let info = getPersonDebtInfo(S, "Rahul");
    assert.equal(info.owed, 10000);
    let clr = checkClearance(info.owed, 4000);
    assert.equal(clr.type, "partial");
    assert.equal(clr.remaining, 6000);

    // Step 3: Partial Repayment 2 - Rahul transfers 4,000 back to SBI BANK
    S.txs.push({
      id: "tx-col-2",
      type: "people",
      kind: "collect",
      amount: 4000,
      person: "Rahul",
      acct: "sbi",
      date: "2026-11-03"
    });

    c = calc(S);
    assert.equal(c.bal["sbi"], 29000, "SBI balance should increase by 4,000 to 29,000");
    assert.equal(c.bal["cash"], 15000, "Cash balance remains 15,000");
    assert.equal(c.bal["hdfc"], 35000, "HDFC balance remains 35,000");
    assert.equal(c.P["rahul"].owed, 6000, "Rahul should now owe 6,000 (Partial)");

    // Step 4: Final Repayment - Rahul transfers remaining 6,000 to HDFC BANK
    S.txs.push({
      id: "tx-col-3",
      type: "people",
      kind: "collect",
      amount: 6000,
      person: "Rahul",
      acct: "hdfc",
      date: "2026-11-04"
    });

    c = calc(S);
    assert.equal(c.bal["hdfc"], 41000, "HDFC balance increases by 6,000 to 41,000");
    assert.equal(c.bal["cash"], 15000, "Cash balance is 15,000");
    assert.equal(c.bal["sbi"], 29000, "SBI balance is 29,000");

    // Total money in all accounts: 41000 + 15000 + 29000 = 85,000!
    const totalLiquid = c.bal["cash"] + c.bal["hdfc"] + c.bal["sbi"];
    assert.equal(totalLiquid, 85000, "Total liquidity across all 3 accounts is 100% preserved");

    // Rahul's debt is completely cleared!
    assert.equal(c.P["rahul"].owed, 0, "Rahul's debt is 0 (Fully Cleared & Settled)");

    // Active debtors list has zero debtors
    debtors = getActiveDebtors(S, "collect");
    assert.equal(debtors.length, 0, "Rahul is no longer in active debtors");
  });

  test("Scenario 3: Editing existing repayment restores pre-transaction baseline", () => {
    const S = setupState();

    // Lent 10,000 to Rahul from HDFC
    S.txs.push({
      id: "lend-1",
      type: "people",
      kind: "lend",
      amount: 10000,
      person: "Rahul",
      acct: "hdfc",
      date: "2026-11-01"
    });

    // Repaid 4,000 to Cash
    S.txs.push({
      id: "col-1",
      type: "people",
      kind: "collect",
      amount: 4000,
      person: "Rahul",
      acct: "cash",
      date: "2026-11-02"
    });

    // In current state, Rahul owes 6,000
    assert.equal(calc(S).P["rahul"].owed, 6000);

    // If editing tx "col-1", pre-transaction debt should be 10,000 (not 6,000)
    const editInfo = getPersonDebtInfo(S, "Rahul", "col-1");
    assert.equal(editInfo.owed, 10000, "Pre-transaction debt must restore to 10,000");

    // If user changes repayment to 10,000:
    const clrFull = checkClearance(editInfo.owed, 10000);
    assert.equal(clrFull.type, "cleared");

    // If user changes repayment to 3,000:
    const clrPart = checkClearance(editInfo.owed, 3000);
    assert.equal(clrPart.type, "partial");
    assert.equal(clrPart.remaining, 7000);
  });

  test("Scenario 4: Deleting a repayment entry cleanly restores remaining debt", () => {
    const S = setupState();

    S.txs.push({
      id: "l1",
      type: "people",
      kind: "lend",
      amount: 8000,
      person: "Vikram",
      acct: "cash",
      date: "2026-11-01"
    });

    S.txs.push({
      id: "c1",
      type: "people",
      kind: "collect",
      amount: 3000,
      person: "Vikram",
      acct: "cash",
      date: "2026-11-02"
    });

    assert.equal(calc(S).P["vikram"].owed, 5000);

    // Delete the collect transaction
    S.txs = S.txs.filter((t) => t.id !== "c1");

    // Debt should immediately return to 8,000
    assert.equal(calc(S).P["vikram"].owed, 8000);
    assert.equal(calc(S).bal["cash"], 2000);
  });

  test("Scenario 5: Paise fractional precision (e.g. ₹333.33 split)", () => {
    const S = setupState();

    S.txs.push({
      id: "p1",
      type: "people",
      kind: "lend",
      amount: 333.33,
      person: "Neha",
      acct: "cash",
      date: "2026-11-01"
    });

    S.txs.push({
      id: "p2",
      type: "people",
      kind: "collect",
      amount: 111.11,
      person: "Neha",
      acct: "cash",
      date: "2026-11-02"
    });

    assert.equal(calc(S).P["neha"].owed, 222.22);

    S.txs.push({
      id: "p3",
      type: "people",
      kind: "collect",
      amount: 222.22,
      person: "Neha",
      acct: "cash",
      date: "2026-11-03"
    });

    assert.equal(calc(S).P["neha"].owed, 0);
  });

  test("Scenario 6: Symmetrical Borrow & Repay across multiple accounts", () => {
    const S = setupState();

    // Borrowed 20,000 from Sneha into HDFC Bank
    S.txs.push({
      id: "b1",
      type: "people",
      kind: "borrow",
      amount: 20000,
      person: "Sneha",
      acct: "hdfc",
      date: "2026-11-01"
    });

    let c = calc(S);
    assert.equal(c.bal["hdfc"], 70000, "HDFC balance increases by 20,000");
    assert.equal(c.P["sneha"].owe, 20000, "You owe Sneha 20,000");

    let debtors = getActiveDebtors(S, "repay");
    assert.equal(debtors.length, 1);
    assert.equal(debtors[0].name, "Sneha");
    assert.equal(debtors[0].amount, 20000);

    // Paid back partially: 5,000 from Cash
    S.txs.push({
      id: "r1",
      type: "people",
      kind: "repay",
      amount: 5000,
      person: "Sneha",
      acct: "cash",
      date: "2026-11-02"
    });

    c = calc(S);
    assert.equal(c.bal["cash"], 5000, "Cash reduced to 5,000");
    assert.equal(c.P["sneha"].owe, 15000, "You still owe 15,000 (Partial)");

    // Paid back remaining: 15,000 from SBI Bank
    S.txs.push({
      id: "r2",
      type: "people",
      kind: "repay",
      amount: 15000,
      person: "Sneha",
      acct: "sbi",
      date: "2026-11-03"
    });

    c = calc(S);
    assert.equal(c.bal["sbi"], 10000, "SBI reduced to 10,000");
    assert.equal(c.P["sneha"].owe, 0, "Debt to Sneha is fully cleared");

    debtors = getActiveDebtors(S, "repay");
    assert.equal(debtors.length, 0);
  });

  test("Scenario 7: Bill Split & Multi-Account Repayments (Cash + Same Account + Different Account)", () => {
    const S = setupState();
    // Starting Balances:
    // Cash = 10,000 | HDFC = 50,000 | SBI = 25,000. Total = 85,000

    // Step 1: Paid a dinner bill of 6,000 from HDFC Bank.
    // The bill is split 3 ways:
    // - My personal share: 2,000 (Expense: Food)
    // - Amit's share: 2,000 (Lend to Amit, paid from HDFC)
    // - Sara's share: 2,000 (Lend to Sara, paid from HDFC)
    S.txs.push({
      id: "split-my-share",
      type: "expense",
      cat: "food",
      amount: 2000,
      acct: "hdfc",
      date: "2026-11-01",
      note: "Dinner with Amit & Sara (My share)"
    });
    S.txs.push({
      id: "split-amit-lend",
      type: "people",
      kind: "lend",
      amount: 2000,
      person: "Amit",
      acct: "hdfc",
      date: "2026-11-01",
      note: "Dinner split"
    });
    S.txs.push({
      id: "split-sara-lend",
      type: "people",
      kind: "lend",
      amount: 2000,
      person: "Sara",
      acct: "hdfc",
      date: "2026-11-01",
      note: "Dinner split"
    });

    let c = calc(S);
    // HDFC paid all 6,000 (2000 expense + 2000 amit + 2000 sara)
    assert.equal(c.bal["hdfc"], 44000, "HDFC paid 6,000, drops from 50,000 to 44,000");
    assert.equal(c.bal["cash"], 10000, "Cash remains 10,000");
    assert.equal(c.bal["sbi"], 25000, "SBI remains 25,000");
    assert.equal(c.P["amit"].owed, 2000, "Amit owes 2,000");
    assert.equal(c.P["sara"].owed, 2000, "Sara owes 2,000");

    // Monthly expense stats: exactly 2,000 (my share), NOT 6,000!
    const st = stats(S, "2026-11");
    assert.equal(st.spent, 2000, "Monthly spent records only user's personal share of 2,000");

    // Step 2: Repayment 1 - Amit gives 2,000 in physical CASH
    // Money MUST enter the "cash" account and clear Amit's debt
    S.txs.push({
      id: "amit-repay-cash",
      type: "people",
      kind: "collect",
      amount: 2000,
      person: "Amit",
      acct: "cash", // <-- Selected destination is CASH
      date: "2026-11-02"
    });

    c = calc(S);
    assert.equal(c.bal["cash"], 12000, "Cash balance increases by 2,000 to 12,000");
    assert.equal(c.bal["hdfc"], 44000, "HDFC unchanged at 44,000");
    assert.equal(c.bal["sbi"], 25000, "SBI unchanged at 25,000");
    assert.equal(c.P["amit"].owed, 0, "Amit's debt is 100% fully cleared");

    // Step 3: Repayment 2 - Sara pays 1,000 via UPI into SAME ACCOUNT (HDFC)
    S.txs.push({
      id: "sara-repay-hdfc",
      type: "people",
      kind: "collect",
      amount: 1000,
      person: "Sara",
      acct: "hdfc", // <-- Selected destination is HDFC (same account)
      date: "2026-11-03"
    });

    c = calc(S);
    assert.equal(c.bal["hdfc"], 45000, "HDFC increases by 1,000 to 45,000");
    assert.equal(c.bal["cash"], 12000, "Cash unchanged at 12,000");
    assert.equal(c.bal["sbi"], 25000, "SBI unchanged at 25,000");
    assert.equal(c.P["sara"].owed, 1000, "Sara still owes 1,000 (Partial)");

    // Step 4: Repayment 3 - Sara pays remaining 1,000 via GPay into SOME OTHER ACCOUNT (SBI)
    S.txs.push({
      id: "sara-repay-sbi",
      type: "people",
      kind: "collect",
      amount: 1000,
      person: "Sara",
      acct: "sbi", // <-- Selected destination is SBI (different account)
      date: "2026-11-04"
    });

    c = calc(S);
    assert.equal(c.bal["sbi"], 26000, "SBI increases by 1,000 to 26,000");
    assert.equal(c.bal["hdfc"], 45000, "HDFC remains 45,000");
    assert.equal(c.bal["cash"], 12000, "Cash remains 12,000");
    assert.equal(c.P["sara"].owed, 0, "Sara's debt is 100% fully cleared");

    // Final Ledger Reconciliation:
    // Cash: 12,000 (+2,000)
    // HDFC: 45,000 (-5,000 net: paid 6,000, received 1,000 back)
    // SBI:  26,000 (+1,000)
    // Total: 12,000 + 45,000 + 26,000 = 83,000.
    // Initial was 85,000.
    // Difference is exactly 2,000 (User's dinner share)!
    const finalTotal = c.bal["cash"] + c.bal["hdfc"] + c.bal["sbi"];
    assert.equal(finalTotal, 83000, "Total liquidity reflects starting (85,000) minus personal expense (2,000)");
    assert.equal(c.P["amit"].owed, 0, "Amit is fully cleared");
    assert.equal(c.P["sara"].owed, 0, "Sara is fully cleared");
  });

  test("Scenario 8: Source clarity breakdown, skipAcct, shortage math, and account calibration", () => {
    const S = {
      cur: "INR",
      accounts: [
        { id: "cash", name: "Cash", open: 5000 },
        { id: "hdfc", name: "HDFC", open: 10000 }
      ],
      txs: [
        // Keeping 8,000 for Rahul in Cash (but Cash only has 5,000 opening balance)
        { id: "t1", type: "people", kind: "hold", amount: 8000, person: "Rahul", acct: "cash", date: "2026-11-01" },
        // Lent 4,000 to Suresh from Cash
        { id: "t2", type: "people", kind: "lend", amount: 4000, person: "Suresh", acct: "cash", date: "2026-11-02" },
        // Past record: Old record income 50,000 (skipAcct = true, should NOT modify HDFC balance)
        { id: "t3", type: "income", amount: 50000, acct: "hdfc", note: "Bonus", date: "2026-11-02", skipAcct: true }
      ]
    };

    const c = calc(S);
    // Cash balance: 5,000 + 8,000 (kept) - 4,000 (lent) = 9,000
    assert.equal(c.bal["cash"], 9000);
    // HDFC balance: 10,000 (t3 had skipAcct: true, so it remained 10,000)
    assert.equal(c.bal["hdfc"], 10000);

    // Kept in cash: 8,000
    assert.equal(c.held["cash"], 8000);
    // Lent from cash: 4,000
    assert.equal(c.lent["cash"], 4000);

    // My own money in cash: 9,000 (bal) + 4,000 (lent) - 8,000 (held) - 0 (owe) = 5,000
    const myMoneyCash = c.bal["cash"] + c.lent["cash"] - c.held["cash"] - c.owe["cash"];
    assert.equal(myMoneyCash, 5000);

    // Total accounts: 9,000 + 10,000 = 19,000
    const tot = c.bal["cash"] + c.bal["hdfc"];
    assert.equal(tot, 19000);

    // Net user actual own money across all accounts:
    // tot (19,000) + totLent (4,000) - totHeld (8,000) - totOwe (0) = 15,000
    const netUser = tot + (c.lent["cash"] + c.lent["hdfc"]) - (c.held["cash"] + c.held["hdfc"]) - (c.owe["cash"] + c.owe["hdfc"]);
    assert.equal(netUser, 15000);

    // Account Balance Auto-Calibration Test:
    // User sees Cash balance is 9,000, but real cash in wallet is 7,500.
    // User inputs targetBal = 7,500.
    // txSum in cash is +8,000 (hold) - 4,000 (lend) = +4,000.
    // calibrated openVal = targetBal - txSum = 7,500 - 4,000 = 3,500.
    const targetBal = 7500;
    const txSum = 8000 - 4000;
    const openVal = targetBal - txSum;
    assert.equal(openVal, 3500);

    // Verify new balance equals targetBal with calibrated openVal:
    S.accounts[0].open = openVal;
    const c2 = calc(S);
    assert.equal(c2.bal["cash"], 7500, "Calibrating open balance correctly matches target reality");
  });
});

