import { useLiveQuery } from "dexie-react-hooks";
import { useSyncExternalStore } from "react";
import {
  localDB,
  newId,
  nowIso,
  type LocalWorker,
  type LocalClient,
  type LocalWorkEntry,
  type LocalPayment,
  type LocalTransaction,
} from "./local-db";
import { supabase } from "@/integrations/supabase/client";
import { subscribeSync, getSyncState, syncNow } from "./sync";

// ---- Public types (camelCase) used by UI components ----

export type Worker = {
  id: string;
  name: string;
  mobile: string; // Phone
  rollNumber: string; // Roll number
  classId: string | null; // Class ID
  photo?: string | null;
};
export type Student = Worker;

export type Client = {
  id: string;
  name: string; // Class Name
  mobile: string; // Semester/Year
  site: string; // Subject Name
  totalProject: number;
  siteImages?: string[] | null;
};
export type Class = Client;

export type WorkEntry = {
  id: string;
  workerId: string;
  classId: string;
  date: string;
  site: string; // Subject Name
  wages: number;
  status: "worked" | "absent";
  notes?: string;
};
export type AttendanceRecord = WorkEntry;

export type Payment = {
  id: string;
  clientId: string;
  date: string;
  amount: number;
  mode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  note?: string | null;
};

export type Transaction = {
  id: string;
  type: "income" | "expense";
  date: string;
  amount: number;
  label: string;
};

export type DB = {
  workers: Student[];
  work: AttendanceRecord[];
  clients: Class[];
  payments: Payment[];
  transactions: Transaction[];
};

const EMPTY: DB = { workers: [], work: [], clients: [], payments: [], transactions: [] };

// ---- Reads: live local-first via Dexie ----

export function useDB(): DB {
  const data = useLiveQuery(async () => {
    const [workers, work, clients, payments, transactions] = await Promise.all([
      localDB.workers.orderBy("updated_at").reverse().toArray(),
      localDB.work_entries.orderBy("date").reverse().toArray(),
      localDB.clients.orderBy("updated_at").reverse().toArray(),
      localDB.payments.orderBy("date").reverse().toArray(),
      localDB.transactions.orderBy("date").reverse().toArray(),
    ]);
    return mapAll({ workers, work, clients, payments, transactions });
  }, []);
  return data ?? EMPTY;
}

function mapAll(raw: {
  workers: LocalWorker[];
  work: LocalWorkEntry[];
  clients: LocalClient[];
  payments: LocalPayment[];
  transactions: LocalTransaction[];
}): DB {
  return {
    workers: raw.workers.map((w) => ({
      id: w.id,
      name: w.name,
      mobile: w.mobile,
      rollNumber: w.roll_number || "",
      classId: w.class_id,
      photo: w.photo,
    })),
    work: raw.work.map((e) => ({
      id: e.id,
      workerId: e.worker_id,
      classId: e.class_id || "",
      date: e.date,
      site: e.site,
      wages: Number(e.wages),
      status: e.status,
      notes: e.notes || "",
    })),
    clients: raw.clients.map((c) => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      site: c.site,
      totalProject: Number(c.total_project),
      siteImages: c.site_images ? JSON.parse(c.site_images) : [],
    })),
    payments: raw.payments.map((p) => ({
      id: p.id, clientId: p.client_id, date: p.date, amount: Number(p.amount),
      mode: p.mode as Payment["mode"], note: p.note,
    })),
    transactions: raw.transactions.map((t) => ({
      id: t.id, type: t.type, date: t.date,
      amount: Number(t.amount), label: t.label,
    })),
  };
}

// Backwards-compat shim: react-query is gone here, but old callers still ask.
export function useHydrated() {
  const data = useLiveQuery(() => localDB.meta.get("lastPull"), []);
  return data !== undefined;
}

export function useDBStatus() {
  // Local-first reads are synchronous from the user's POV — never "loading".
  return { isLoading: false as const, isError: false as const };
}

// ---- Sync state hook for header indicator ----

export function useSyncStatus() {
  return useSyncExternalStore(
    (cb) => subscribeSync(cb),
    () => getSyncState(),
    () => getSyncState(),
  );
}

// ---- Writes: local-first, then enqueue for Supabase ----

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (data.user) return data.user.id;
  // Fallback for offline: read from cached session.
  const { data: s } = await supabase.auth.getSession();
  if (s.session?.user?.id) return s.session.user.id;
  throw new Error("Not signed in");
}

async function enqueue(
  table: "workers" | "clients" | "work_entries" | "payments" | "transactions",
  payload: Record<string, unknown>,
  user_id: string,
) {
  await localDB.outbox.add({
    user_id,
    table,
    op: "insert",
    payload,
    created_at: nowIso(),
    attempts: 0,
    last_error: null,
  });
}

export const actions = {
  async addWorker(w: Omit<Worker, "id">) {
    const user_id = await currentUserId();
    const row: LocalWorker = {
      id: newId(),
      user_id,
      name: w.name,
      mobile: w.mobile ?? "",
      roll_number: w.rollNumber ?? "",
      class_id: w.classId ?? null,
      photo: w.photo ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
      _dirty: 1,
    };
    await localDB.workers.put(row);
    await enqueue("workers", { ...stripDirty(row) }, user_id);
    void syncNow();
  },

  async updateWorker(id: string, w: Omit<Worker, "id">) {
    const user_id = await currentUserId();
    const row: LocalWorker = {
      id,
      user_id,
      name: w.name,
      mobile: w.mobile ?? "",
      roll_number: w.rollNumber ?? "",
      class_id: w.classId ?? null,
      photo: w.photo ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
      _dirty: 1,
    };
    await localDB.workers.put(row);
    await enqueue("workers", { ...stripDirty(row) }, user_id);
    void syncNow();
  },

  async deleteWorker(id: string) {
    const user_id = await currentUserId();
    await localDB.workers.delete(id);
    const entries = await localDB.work_entries.where("worker_id").equals(id).toArray();
    await Promise.all(entries.map((e) => localDB.work_entries.delete(e.id)));
    if (navigator.onLine) {
      await supabase.from("workers").delete().eq("id", id);
    }
    void syncNow();
  },

  async addClient(c: Omit<Client, "id">) {
    const user_id = await currentUserId();
    const row: LocalClient = {
      id: newId(),
      user_id,
      name: c.name,
      mobile: c.mobile ?? "",
      site: c.site ?? "",
      total_project: c.totalProject ?? 0,
      site_images: c.siteImages ? JSON.stringify(c.siteImages) : null,
      created_at: nowIso(),
      updated_at: nowIso(),
      _dirty: 1,
    };
    await localDB.clients.put(row);
    await enqueue("clients", { ...stripDirty(row) }, user_id);
    void syncNow();
  },

  async updateClient(id: string, c: Omit<Client, "id">) {
    const user_id = await currentUserId();
    const row: LocalClient = {
      id,
      user_id,
      name: c.name,
      mobile: c.mobile ?? "",
      site: c.site ?? "",
      total_project: c.totalProject ?? 0,
      site_images: c.siteImages ? JSON.stringify(c.siteImages) : null,
      created_at: nowIso(),
      updated_at: nowIso(),
      _dirty: 1,
    };
    await localDB.clients.put(row);
    await enqueue("clients", { ...stripDirty(row) }, user_id);
    void syncNow();
  },

  async deleteClient(id: string) {
    await localDB.clients.delete(id);
    const workers = await localDB.workers.where("class_id").equals(id).toArray();
    for (const w of workers) {
      const updated: LocalWorker = { ...w, class_id: null, _dirty: 1 };
      await localDB.workers.put(updated);
      await enqueue("workers", { ...stripDirty(updated) }, w.user_id);
    }
    const entries = await localDB.work_entries.where("class_id").equals(id).toArray();
    for (const e of entries) {
      await localDB.work_entries.delete(e.id);
    }
    if (navigator.onLine) {
      await supabase.from("clients").delete().eq("id", id);
    }
    void syncNow();
  },

  async saveAttendance(
    classId: string,
    date: string,
    subjectName: string,
    records: { studentId: string; status: "worked" | "absent" }[],
    notes: string,
  ) {
    const user_id = await currentUserId();
    for (const r of records) {
      const list = await localDB.work_entries.where("worker_id").equals(r.studentId).toArray();
      const matched = list.find((e) => e.date === date);

      const row: LocalWorkEntry = {
        id: matched?.id ?? newId(),
        user_id,
        worker_id: r.studentId,
        date,
        site: subjectName,
        wages: 0,
        status: r.status,
        class_id: classId,
        notes: notes || null,
        created_at: matched?.created_at ?? nowIso(),
        _dirty: 1,
      };
      await localDB.work_entries.put(row);
      await enqueue("work_entries", { ...stripDirty(row) }, user_id);
    }
    void syncNow();
  },

  async addWork(e: Omit<WorkEntry, "id">) {
    const user_id = await currentUserId();
    const row: LocalWorkEntry = {
      id: newId(),
      user_id,
      worker_id: e.workerId,
      date: e.date,
      site: e.site,
      wages: e.wages,
      status: e.status,
      class_id: e.classId || null,
      notes: e.notes || null,
      created_at: nowIso(),
      _dirty: 1,
    };
    await localDB.work_entries.put(row);
    await enqueue("work_entries", { ...stripDirty(row) }, user_id);

    if (e.status === "worked" && e.wages > 0) {
      const worker = await localDB.workers.get(e.workerId);
      const tx: LocalTransaction = {
        id: newId(),
        user_id,
        type: "expense",
        date: e.date,
        amount: e.wages,
        label: `${worker?.name ?? "Worker"} (Wages)`,
        created_at: nowIso(),
        _dirty: 1,
      };
      await localDB.transactions.put(tx);
      await enqueue("transactions", { ...stripDirty(tx) }, user_id);
    }
    void syncNow();
  },

  async addPayment(p: Omit<Payment, "id">) {
    const user_id = await currentUserId();
    const row: LocalPayment = {
      id: newId(),
      user_id,
      client_id: p.clientId,
      date: p.date,
      amount: p.amount,
      mode: p.mode,
      note: p.note ?? null,
      created_at: nowIso(),
      _dirty: 1,
    };
    await localDB.payments.put(row);
    await enqueue("payments", { ...stripDirty(row) }, user_id);

    const client = await localDB.clients.get(p.clientId);
    const tx: LocalTransaction = {
      id: newId(),
      user_id,
      type: "income",
      date: p.date,
      amount: p.amount,
      label: `${client?.name ?? "Client"} Payment`,
      created_at: nowIso(),
      _dirty: 1,
    };
    await localDB.transactions.put(tx);
    await enqueue("transactions", { ...stripDirty(tx) }, user_id);
    void syncNow();
  },
};

function stripDirty<T extends { _dirty?: 0 | 1 }>(row: T): Omit<T, "_dirty"> {
  const copy = { ...row };
  delete copy._dirty;
  return copy;
}

// ---- Compatibility shims for the old react-query store ----

export function useInvalidateDB() {
  return () => void syncNow();
}

export function useAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  // Kept for backwards-compat. New code can just `await actions.x()` directly.
  return {
    mutateAsync: (args: TArgs) => fn(...args),
    isPending: false,
  };
}

// ---- Derived helpers ----

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
  return "₹" + (n || 0).toLocaleString("en-IN");
}

export function dayName(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "long" });
}
