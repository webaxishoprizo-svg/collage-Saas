import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Worker = {
  id: string;
  name: string;
  mobile: string;
  photo?: string | null;
};

export type WorkEntry = {
  id: string;
  workerId: string;
  date: string;
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
  workers: Worker[];
  work: WorkEntry[];
  clients: Client[];
  payments: Payment[];
  transactions: Transaction[];
};

const EMPTY: DB = { workers: [], work: [], clients: [], payments: [], transactions: [] };

async function fetchDB(): Promise<DB> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return EMPTY;

  const [workersR, workR, clientsR, paymentsR, txR] = await Promise.all([
    supabase.from("workers").select("*").order("created_at", { ascending: false }),
    supabase.from("work_entries").select("*").order("date", { ascending: false }),
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("payments").select("*").order("date", { ascending: false }),
    supabase.from("transactions").select("*").order("date", { ascending: false }),
  ]);

  return {
    workers: (workersR.data ?? []).map((w) => ({
      id: w.id, name: w.name, mobile: w.mobile ?? "", photo: w.photo,
    })),
    work: (workR.data ?? []).map((e) => ({
      id: e.id, workerId: e.worker_id, date: e.date, site: e.site ?? "",
      wages: Number(e.wages), status: e.status as "worked" | "absent",
    })),
    clients: (clientsR.data ?? []).map((c) => ({
      id: c.id, name: c.name, mobile: c.mobile ?? "", site: c.site ?? "",
      totalProject: Number(c.total_project),
    })),
    payments: (paymentsR.data ?? []).map((p) => ({
      id: p.id, clientId: p.client_id, date: p.date, amount: Number(p.amount),
      mode: p.mode as Payment["mode"], note: p.note,
    })),
    transactions: (txR.data ?? []).map((t) => ({
      id: t.id, type: t.type as "income" | "expense", date: t.date,
      amount: Number(t.amount), label: t.label,
    })),
  };
}

const DB_KEY = ["db"] as const;

export function useDB(): DB {
  const { data } = useQuery({ queryKey: DB_KEY, queryFn: fetchDB, staleTime: 5_000 });
  return data ?? EMPTY;
}

export function useDBStatus() {
  return useQuery({ queryKey: DB_KEY, queryFn: fetchDB, staleTime: 5_000 });
}

// Backwards-compat shim — data hydration is now handled by react-query.
export function useHydrated() {
  const { isSuccess } = useQuery({ queryKey: DB_KEY, queryFn: fetchDB, staleTime: 5_000 });
  return isSuccess;
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export const actions = {
  async addWorker(w: Omit<Worker, "id">) {
    const user_id = await currentUserId();
    const { error } = await supabase.from("workers").insert({
      user_id, name: w.name, mobile: w.mobile, photo: w.photo ?? null,
    });
    if (error) throw error;
  },
  async addWork(e: Omit<WorkEntry, "id">) {
    const user_id = await currentUserId();
    const { error } = await supabase.from("work_entries").insert({
      user_id, worker_id: e.workerId, date: e.date, site: e.site,
      wages: e.wages, status: e.status,
    });
    if (error) throw error;

    if (e.status === "worked" && e.wages > 0) {
      const { data: worker } = await supabase.from("workers").select("name").eq("id", e.workerId).maybeSingle();
      await supabase.from("transactions").insert({
        user_id, type: "expense", date: e.date, amount: e.wages,
        label: `${worker?.name ?? "Worker"} (Wages)`,
      });
    }
  },
  async addClient(c: Omit<Client, "id">) {
    const user_id = await currentUserId();
    const { error } = await supabase.from("clients").insert({
      user_id, name: c.name, mobile: c.mobile, site: c.site, total_project: c.totalProject,
    });
    if (error) throw error;
  },
  async addPayment(p: Omit<Payment, "id">) {
    const user_id = await currentUserId();
    const { error } = await supabase.from("payments").insert({
      user_id, client_id: p.clientId, date: p.date, amount: p.amount,
      mode: p.mode, note: p.note ?? null,
    });
    if (error) throw error;

    const { data: client } = await supabase.from("clients").select("name").eq("id", p.clientId).maybeSingle();
    await supabase.from("transactions").insert({
      user_id, type: "income", date: p.date, amount: p.amount,
      label: `${client?.name ?? "Client"} Payment`,
    });
  },
};

export function useInvalidateDB() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: DB_KEY });
}

/** Wrap an async action so it invalidates the cached DB on success. */
export function useAction<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
) {
  const invalidate = useInvalidateDB();
  return useMutation({
    mutationFn: (args: TArgs) => fn(...args),
    onSuccess: () => invalidate(),
  });
}

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
