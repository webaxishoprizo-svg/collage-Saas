import { useEffect, useState, useSyncExternalStore } from "react";

export type Worker = {
  id: string;
  name: string;
  mobile: string;
  photo?: string;
};

export type WorkEntry = {
  id: string;
  workerId: string;
  date: string; // ISO yyyy-mm-dd
  site: string;
  wages: number;
  status: "worked" | "absent";
};

export type Client = {
  id: string;
  name: string;
  mobile: string;
  site: string;
  totalProject: number;
};

export type Payment = {
  id: string;
  clientId: string;
  date: string;
  amount: number;
  mode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  note?: string;
};

export type Transaction = {
  id: string;
  type: "income" | "expense";
  date: string;
  amount: number;
  label: string;
};

type DB = {
  workers: Worker[];
  work: WorkEntry[];
  clients: Client[];
  payments: Payment[];
  transactions: Transaction[];
};

const KEY = "pwms_db_v1";

const seed: DB = {
  workers: [
    { id: "w1", name: "Ravi Kumar", mobile: "9876543210" },
    { id: "w2", name: "Suresh Patel", mobile: "9876543211" },
    { id: "w3", name: "Mohit Singh", mobile: "9876543212" },
    { id: "w4", name: "Deepak Yadav", mobile: "9876543213" },
  ],
  work: [
    { id: "we1", workerId: "w1", date: today(), site: "Site A", wages: 800, status: "worked" },
    { id: "we2", workerId: "w2", date: today(), site: "Site B", wages: 750, status: "worked" },
    { id: "we3", workerId: "w3", date: today(), site: "Site A", wages: 700, status: "worked" },
    { id: "we4", workerId: "w4", date: today(), site: "Site A", wages: 0, status: "absent" },
  ],
  clients: [
    { id: "c1", name: "Client A", mobile: "9876543210", site: "Site A", totalProject: 60000 },
    { id: "c2", name: "Client B", mobile: "9876543220", site: "Site B", totalProject: 35000 },
    { id: "c3", name: "Client C", mobile: "9876543230", site: "Site C", totalProject: 20000 },
  ],
  payments: [
    { id: "p1", clientId: "c1", date: "2024-05-28", amount: 10000, mode: "Cash" },
    { id: "p2", clientId: "c1", date: "2024-05-20", amount: 20000, mode: "Bank Transfer" },
    { id: "p3", clientId: "c1", date: "2024-05-10", amount: 20000, mode: "UPI" },
    { id: "p4", clientId: "c2", date: "2024-05-27", amount: 30000, mode: "Cash" },
    { id: "p5", clientId: "c3", date: "2024-05-15", amount: 20000, mode: "UPI" },
  ],
  transactions: [
    { id: "t1", type: "income", date: "2024-05-28", amount: 10000, label: "Client A Payment" },
    { id: "t2", type: "expense", date: "2024-05-28", amount: 800, label: "Ravi Kumar (Wages)" },
    { id: "t3", type: "income", date: "2024-05-27", amount: 20000, label: "Client B Payment" },
    { id: "t4", type: "expense", date: "2024-05-27", amount: 750, label: "Suresh Patel (Wages)" },
    { id: "t5", type: "expense", date: "2024-05-27", amount: 700, label: "Mohit Singh (Wages)" },
  ],
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

const listeners = new Set<() => void>();

function read(): DB {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as DB;
  } catch {
    return seed;
  }
}

let cache: DB | null = null;

function getSnapshot(): DB {
  if (!cache) cache = read();
  return cache;
}

function setDB(updater: (db: DB) => DB) {
  const next = updater(getSnapshot());
  cache = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDB() {
  const db = useSyncExternalStore(subscribe, getSnapshot, () => seed);
  return db;
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  addWorker(w: Omit<Worker, "id">) {
    setDB((db) => ({ ...db, workers: [{ ...w, id: uid() }, ...db.workers] }));
  },
  addWork(e: Omit<WorkEntry, "id">) {
    const worker = getSnapshot().workers.find((w) => w.id === e.workerId);
    setDB((db) => ({
      ...db,
      work: [{ ...e, id: uid() }, ...db.work],
      transactions:
        e.status === "worked" && e.wages > 0
          ? [
              {
                id: uid(),
                type: "expense",
                date: e.date,
                amount: e.wages,
                label: `${worker?.name ?? "Worker"} (Wages)`,
              },
              ...db.transactions,
            ]
          : db.transactions,
    }));
  },
  addClient(c: Omit<Client, "id">) {
    setDB((db) => ({ ...db, clients: [{ ...c, id: uid() }, ...db.clients] }));
  },
  addPayment(p: Omit<Payment, "id">) {
    const client = getSnapshot().clients.find((c) => c.id === p.clientId);
    setDB((db) => ({
      ...db,
      payments: [{ ...p, id: uid() }, ...db.payments],
      transactions: [
        {
          id: uid(),
          type: "income",
          date: p.date,
          amount: p.amount,
          label: `${client?.name ?? "Client"} Payment`,
        },
        ...db.transactions,
      ],
    }));
  },
  addTransaction(t: Omit<Transaction, "id">) {
    setDB((db) => ({ ...db, transactions: [{ ...t, id: uid() }, ...db.transactions] }));
  },
};

export function totals(db: DB) {
  const income = db.transactions.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const expense = db.transactions.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  return { income, expense, profit: income - expense };
}

export function clientTotals(db: DB, clientId: string) {
  const client = db.clients.find((c) => c.id === clientId);
  const paid = db.payments.filter((p) => p.clientId === clientId).reduce((a, b) => a + b.amount, 0);
  const pending = (client?.totalProject ?? 0) - paid;
  return { paid, pending: Math.max(0, pending), total: client?.totalProject ?? 0 };
}

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export function dayName(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "long" });
}
