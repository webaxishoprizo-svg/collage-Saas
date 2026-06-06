import { supabase } from "@/integrations/supabase/client";
import {
  localDB,
  type OutboxEntry,
  type LocalWorker,
  type LocalClient,
  type LocalWorkEntry,
  type LocalPayment,
  type LocalTransaction,
} from "./local-db";

type SyncState = {
  online: boolean;
  syncing: boolean;
  lastSync: string | null;
  pendingCount: number;
  error: string | null;
};

const state: SyncState = {
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  syncing: false,
  lastSync: null,
  pendingCount: 0,
  error: null,
};

type Listener = (s: SyncState) => void;
const listeners = new Set<Listener>();

export function getSyncState(): SyncState {
  return { ...state };
}

export function subscribeSync(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function emit() {
  const snap = getSyncState();
  listeners.forEach((l) => l(snap));
}

async function refreshPendingCount() {
  state.pendingCount = await localDB.outbox.count();
  emit();
}

export async function pullAll(userId: string) {
  const [w, c, we, p, t] = await Promise.all([
    supabase.from("workers").select("*").eq("user_id", userId),
    supabase.from("clients").select("*").eq("user_id", userId),
    supabase.from("work_entries").select("*").eq("user_id", userId),
    supabase.from("payments").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*").eq("user_id", userId),
  ]);

  const err = w.error || c.error || we.error || p.error || t.error;
  if (err) throw err;

  await localDB.transaction(
    "rw",
    [
      localDB.workers,
      localDB.clients,
      localDB.work_entries,
      localDB.payments,
      localDB.transactions,
    ],
    async () => {
      // Preserve any locally-dirty rows that haven't synced yet.
      const dirtyWorkers = await localDB.workers.where("_dirty").equals(1).toArray();
      const dirtyClients = await localDB.clients.where("_dirty").equals(1).toArray();
      const dirtyWork = await localDB.work_entries.where("_dirty").equals(1).toArray();
      const dirtyPay = await localDB.payments.where("_dirty").equals(1).toArray();
      const dirtyTx = await localDB.transactions.where("_dirty").equals(1).toArray();

      await Promise.all([
        localDB.workers.clear(),
        localDB.clients.clear(),
        localDB.work_entries.clear(),
        localDB.payments.clear(),
        localDB.transactions.clear(),
      ]);

      await localDB.workers.bulkPut((w.data as LocalWorker[]) ?? []);
      await localDB.clients.bulkPut((c.data as LocalClient[]) ?? []);
      await localDB.work_entries.bulkPut((we.data as LocalWorkEntry[]) ?? []);
      await localDB.payments.bulkPut((p.data as LocalPayment[]) ?? []);
      await localDB.transactions.bulkPut((t.data as LocalTransaction[]) ?? []);

      // Re-apply dirty rows so unsynced local writes survive a pull.
      if (dirtyWorkers.length) await localDB.workers.bulkPut(dirtyWorkers);
      if (dirtyClients.length) await localDB.clients.bulkPut(dirtyClients);
      if (dirtyWork.length) await localDB.work_entries.bulkPut(dirtyWork);
      if (dirtyPay.length) await localDB.payments.bulkPut(dirtyPay);
      if (dirtyTx.length) await localDB.transactions.bulkPut(dirtyTx);
    },
  );

  await localDB.meta.put({ key: "lastPull", value: new Date().toISOString() });
}

async function pushOne(entry: OutboxEntry): Promise<void> {
  const { table, op, payload } = entry;
  if (op !== "insert") return;
  // The discriminated union of insert payloads collapses on supabase-js when
  // table is dynamic; cast through unknown for a typed insert per-table.
  const { error } = await (supabase.from(table).insert as (p: unknown) => Promise<{ error: { code?: string; message: string } | null }>)(payload);
  if (error) {
    // Unique-violation means the row already made it to the server on a prior
    // attempt — treat as success so we don't get stuck.
    if (
      (error as { code?: string }).code === "23505" ||
      /duplicate key/i.test(error.message)
    ) {
      return;
    }
    throw error;
  }
}

async function clearDirtyFlag(
  table: OutboxEntry["table"],
  id: string,
) {
  switch (table) {
    case "workers":
      await localDB.workers.update(id, { _dirty: 0 });
      break;
    case "clients":
      await localDB.clients.update(id, { _dirty: 0 });
      break;
    case "work_entries":
      await localDB.work_entries.update(id, { _dirty: 0 });
      break;
    case "payments":
      await localDB.payments.update(id, { _dirty: 0 });
      break;
    case "transactions":
      await localDB.transactions.update(id, { _dirty: 0 });
      break;
  }
}

export async function flushOutbox() {
  const items = await localDB.outbox.orderBy("created_at").toArray();
  for (const item of items) {
    try {
      await pushOne(item);
      await localDB.outbox.delete(item.id!);
      const rowId = (item.payload as { id?: string }).id;
      if (rowId) await clearDirtyFlag(item.table, rowId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await localDB.outbox.update(item.id!, {
        attempts: item.attempts + 1,
        last_error: msg,
      });
      // Stop on first failure so retries stay ordered. We'll try again on the
      // next sync trigger.
      throw e;
    }
  }
}

let syncInFlight: Promise<void> | null = null;

export async function syncNow(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  if (!state.online) return;

  syncInFlight = (async () => {
    state.syncing = true;
    state.error = null;
    emit();
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      // Push first so server has our writes, then pull a fresh copy.
      await flushOutbox();
      await pullAll(u.user.id);
      state.lastSync = new Date().toISOString();
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      state.syncing = false;
      await refreshPendingCount();
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

let started = false;

export function startSyncEngine() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("online", () => {
    state.online = true;
    emit();
    void syncNow();
  });
  window.addEventListener("offline", () => {
    state.online = false;
    emit();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && state.online) {
      void syncNow();
    }
  });

  // Periodic safety-net flush every 30s.
  setInterval(() => {
    if (state.online) void syncNow();
  }, 30_000);

  void refreshPendingCount();
  void syncNow();
}

/** Call after sign-in to do an initial pull. */
export async function bootstrapAfterSignIn() {
  if (!state.online) return;
  await syncNow();
}

/** Call after sign-out to drop the local cache. */
export async function teardownAfterSignOut() {
  const { clearLocalData } = await import("./local-db");
  await clearLocalData();
  state.lastSync = null;
  state.pendingCount = 0;
  emit();
}
