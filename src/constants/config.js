export const KEY = "where-it-goes-v2";

export const CATS = [
  { id: "home", n: "Rent & home", c: "#3F6C8F" },
  { id: "groc", n: "Groceries", c: "#7BA23F" },
  { id: "food", n: "Eating out", c: "#D9822B" },
  { id: "move", n: "Transport", c: "#8A5CC2" },
  { id: "bills", n: "Bills & recharge", c: "#2E9CA6" },
  { id: "emi", n: "EMI & loans", c: "#B5483A" },
  { id: "shop", n: "Shopping", c: "#D2578C" },
  { id: "health", n: "Health", c: "#4FA36B" },
  { id: "fun", n: "Fun & subscriptions", c: "#C7A12B" },
  { id: "trip", n: "Travel", c: "#5B74C9" },
  { id: "fam", n: "Family & gifts", c: "#A06A4B" },
  { id: "save", n: "Savings & investing", c: "#0B7A63", sv: 1 },
  { id: "other", n: "Other", c: "#7A8A8D" }
];

export const KINDS = {
  borrow: { l: "I borrowed from someone", in: 1 },
  repay: { l: "I paid back someone", in: 0 },
  lend: { l: "I lent to someone", in: 0 },
  collect: { l: "Someone paid me back", in: 1 },
  hold: { l: "Someone gave me money to keep", in: 1 },
  hand: { l: "I returned money kept with me", in: 0 }
};

export const getCat = (id) => CATS.find((c) => c.id === id) || CATS[CATS.length - 1];

export const defState = () => ({
  cur: "INR",
  accounts: [{ id: "cash", name: "Cash", open: 0 }],
  txs: [],
  updatedAt: 0
});
