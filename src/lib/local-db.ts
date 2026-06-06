import Dexie, { type Table } from "dexie";

/**
 * Local mirror of the Supabase tables. Rows are stored in the same snake_case
 * shape as Postgres so syncing back is a 1:1 upsert.
 */
export type LocalWorker = {
  id: string;
  user_id: string;
  name: string;
  mobile: string;
  photo: string | null;
  created_at: string;
  updated_at: string;
  _dirty?: 0 | 1;
};

export type LocalClient = {
  id: string;
  user_id: string;
  name: string;
  mobile: string;
  site: string;
  total_project: number;
  created_at: string;
  updated_at: string;
  _dirty?: 0 | 1;
};

export type LocalWorkEntry = {
  id: string;
  user_id: string;
  worker_id: string;
  date: string;
  site: string;
  wages: number;
  status: "worked" | "absent";
  created_at: string;
  _dirty?: 0 | 1;
};

export type LocalPayment = {
  id: string;
  user_id: string;
  client_id: string;
  date: string;
  amount: number;
  mode: string;
  note: string | null;
  created_at: string;
  _dirty?: 0 | 1;
};

export type LocalTransaction = {
  id: string;
  user_id: string;
  type: "income" | "expense";
  date: string;
  amount: number;
  label: string;
  created_at: string;
  _dirty?: 0 | 1;
};

export type OutboxOp = "insert"; // upgrade later for update/delete

export type OutboxEntry = {
  id?: number;
  user_id: string;
  table:
    | "workers"
    | "clients"
    | "work_entries"
    | "payments"
    | "transactions";
  op: OutboxOp;
  payload: Record<string, unknown>;
  created_at: string;
  attempts: number;
  last_error: string | null;
};

export type SyncMeta = {
  key: string; // e.g. "lastPull"
  value: string;
};

class PWMSLocalDB extends Dexie {
  workers!: Table<LocalWorker, string>;
  clients!: Table<LocalClient, string>;
  work_entries!: Table<LocalWorkEntry, string>;
  payments!: Table<LocalPayment, string>;
  transactions!: Table<LocalTransaction, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<SyncMeta, string>;

  constructor() {
    super("pwms-local-v1");
    this.version(1).stores({
      workers: "id, user_id, updated_at, _dirty",
      clients: "id, user_id, updated_at, _dirty",
      work_entries: "id, user_id, worker_id, date, _dirty",
      payments: "id, user_id, client_id, date, _dirty",
      transactions: "id, user_id, date, type, _dirty",
      outbox: "++id, user_id, table, created_at",
      meta: "key",
    });
  }
}

export const localDB = new PWMSLocalDB();

export async function clearLocalData() {
  await localDB.transaction(
    "rw",
    [
      localDB.workers,
      localDB.clients,
      localDB.work_entries,
      localDB.payments,
      localDB.transactions,
      localDB.outbox,
      localDB.meta,
    ],
    async () => {
      await Promise.all([
        localDB.workers.clear(),
        localDB.clients.clear(),
        localDB.work_entries.clear(),
        localDB.payments.clear(),
        localDB.transactions.clear(),
        localDB.outbox.clear(),
        localDB.meta.clear(),
      ]);
    },
  );
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  // crypto.randomUUID is available in modern browsers and Capacitor WebView.
  return crypto.randomUUID();
}
