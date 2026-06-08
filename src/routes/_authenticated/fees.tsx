import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDB, actions, formatINR, type LMS_DB } from "@/lib/store";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { DollarSign, Edit3, X, Save, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";
import type { LocalStudent, LocalFee } from "@/lib/local-db";

type FeesSearch = {
  filter?: "pending" | "all";
};

export const Route = createFileRoute("/_authenticated/fees")({
  validateSearch: (search: Record<string, unknown>): FeesSearch => {
    return {
      filter: search.filter === "pending" ? "pending" : "all",
    };
  },
  head: () => ({ meta: [{ title: "LMS - Student Fees" }] }),
  component: FeesPage,
});

function FeesPage() {
  const user = getCurrentUser();
  const db = useDB();

  if (!user) {
    return null;
  }

  if (user.role === "teacher") {
    return (
      <AppShell title="Access Denied" back="/">
        <div className="p-8 text-center text-red-500 font-bold">
          Not Authorized to view financial data.
        </div>
      </AppShell>
    );
  }

  return user.role === "super_admin" ? <TeacherFees db={db} /> : <StudentFees user={user} db={db} />;
}

// ================= TEACHER FEES MANAGEMENT =================

function TeacherFees({ db }: { db: LMS_DB }) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [totalFee, setTotalFee] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const editingStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return db.students.find((s: LocalStudent) => s.id === selectedStudentId);
  }, [db.students, selectedStudentId]);

  const searchParams = Route.useSearch();
  const [filterMode, setFilterMode] = useState<"pending" | "all">(searchParams.filter || "all");

  const filteredStudents = useMemo(() => {
    return db.students.filter(
      (s: LocalStudent) => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.campusId.toLowerCase().includes(searchQuery.toLowerCase());
          
        if (!matchesSearch) return false;
        
        if (filterMode === "pending") {
          const fee = db.fees.find((f: LocalFee) => f.studentId === s.id);
          const pendingAmt = fee ? fee.pending : 0;
          return pendingAmt > 0;
        }
        
        return true;
      }
    );
  }, [db.students, db.fees, searchQuery, filterMode]);

  const totalOutstanding = useMemo(() => {
    return db.fees.reduce((sum: number, f: LocalFee) => sum + (f.pending || 0), 0);
  }, [db.fees]);

  const openEditModal = (stuId: string) => {
    const fee = db.fees.find((f: LocalFee) => f.studentId === stuId);
    setSelectedStudentId(stuId);
    setTotalFee(fee ? String(fee.total) : "0");
    setPaidAmount(fee ? String(fee.paid) : "0");
  };

  const closeEditModal = () => {
    setSelectedStudentId(null);
    setTotalFee("");
    setPaidAmount("");
  };

  async function handleSaveFee(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudentId) return;

    const total = Number(totalFee);
    const paid = Number(paidAmount);

    if (isNaN(total) || isNaN(paid) || total < 0 || paid < 0) {
      toast.error("Please enter positive values for fee amounts.");
      return;
    }

    if (paid > total) {
      toast.error("Paid amount cannot exceed total fee.");
      return;
    }

    setBusy(true);
    try {
      await actions.updateFees(selectedStudentId, total, paid);
      toast.success("Student fee status updated.");
      closeEditModal();
    } catch (err) {
      toast.error("Failed to update fees.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Student Fees" back="/">
      {/* Summary outstanding card */}
      <div className="bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb] mb-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-[#2563eb] rounded-lg">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Total Pending Receivables
            </span>
            <h3 className="text-xl font-bold text-[#111827]">{formatINR(totalOutstanding)}</h3>
          </div>
        </div>
      </div>

      {/* Edit Form Drawer Overlay */}
      {selectedStudentId && editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end justify-center px-4 pb-4">
          {/* Transparent click area to close */}
          <div className="absolute inset-0" onClick={closeEditModal} />

          <div className="bg-white w-full max-w-sm rounded-xl p-5 border border-[#e5e7eb] relative z-50 shadow-xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h4 className="font-bold text-sm text-[#111827]">
                  Edit Fees: {editingStudent.name}
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                  Campus ID: {editingStudent.campusId}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveFee} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Total Class Fee (INR)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={totalFee}
                  onChange={(e) => setTotalFee(e.target.value)}
                  className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Paid Amount (INR)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none"
                />
              </div>

              {/* Outstanding computation mock */}
              <div className="bg-gray-50 p-3 rounded-lg text-xs flex justify-between font-bold">
                <span className="text-gray-500">Calculated Pending:</span>
                <span className="text-[#2563eb]">
                  {formatINR(Math.max(0, Number(totalFee) - Number(paidAmount)))}
                </span>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-[#2563eb] text-white rounded-lg py-2.5 text-xs font-bold hover:bg-blue-700 transition flex items-center justify-center gap-1"
              >
                <Save className="h-3.5 w-3.5" />
                {busy ? "Saving Changes..." : "Save Balances"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Students Search list */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name or ID..."
            className="flex-1 border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
          />
          <select 
            value={filterMode} 
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="border border-[#e5e7eb] rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
          >
            <option value="all">All Students</option>
            <option value="pending">Pending Fees Only</option>
          </select>
        </div>

        <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider mb-3">
          Students Accounts Ledger
        </h3>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#e5e7eb] rounded-lg text-xs text-gray-400">
            No students found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((stu: LocalStudent) => {
              const fee = db.fees.find((f: LocalFee) => f.studentId === stu.id) || {
                total: 0,
                paid: 0,
                pending: 0,
              };

              return (
                <div
                  key={stu.id}
                  className="bg-white p-4 rounded-xl border border-[#e5e7eb] flex items-center justify-between shadow-sm"
                >
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-[#111827] text-sm truncate">{stu.name}</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">ID: {stu.campusId}</p>

                    <div className="grid grid-cols-3 gap-2 mt-2 font-semibold text-[10px] text-gray-500">
                      <div>
                        Total:{" "}
                        <span className="text-gray-700 font-bold">{formatINR(fee.total)}</span>
                      </div>
                      <div>
                        Paid:{" "}
                        <span className="text-emerald-600 font-bold">{formatINR(fee.paid)}</span>
                      </div>
                      <div>
                        Pending:{" "}
                        <span className="text-rose-600 font-bold">{formatINR(fee.pending)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditModal(stu.id)}
                    className="p-2.5 border border-[#e5e7eb] rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 shrink-0 ml-3 transition"
                    title="Edit Fees Status"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ================= STUDENT FEES VIEW =================

function StudentFees({ user, db }: { user: AuthUser; db: LMS_DB }) {
  const studentId = user.id;

  const feeRecord = useMemo(() => {
    return (
      db.fees.find((f: LocalFee) => f.studentId === studentId) || {
        total: 0,
        paid: 0,
        pending: 0,
      }
    );
  }, [db.fees, studentId]);

  const payPercent = useMemo(() => {
    if (feeRecord.total === 0) return 0;
    return Math.round((feeRecord.paid / feeRecord.total) * 100);
  }, [feeRecord]);

  const isFullyPaid = feeRecord.pending === 0 && feeRecord.total > 0;

  return (
    <AppShell title="My Fee Statement" back="/">
      {/* Graphic overall status card */}
      <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e5e7eb] mb-6 shadow-sm">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-[#2563eb]" /> Student Fee Account
        </h3>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              isFullyPaid ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
            }`}
          >
            {isFullyPaid ? (
              <CheckCircle className="h-6 w-6" />
            ) : (
              <AlertCircle className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Account Status
            </p>
            <h4
              className={`font-bold text-sm text-[#111827] ${
                isFullyPaid ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {feeRecord.total === 0
                ? "No Fee Structure Set"
                : isFullyPaid
                  ? "Dues Cleared (100% Paid)"
                  : `${payPercent}% Paid — Pending Balance`}
            </h4>
          </div>
        </div>

        {/* Visual progress bar */}
        {feeRecord.total > 0 && (
          <div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFullyPaid ? "bg-emerald-500" : "bg-blue-500"
                }`}
                style={{ width: `${payPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
              <span>{payPercent}% Paid</span>
              <span>100% (Cleared)</span>
            </div>
          </div>
        )}
      </div>

      {/* Ledger balance sheet card */}
      <div className="bg-white p-5 rounded-xl border border-[#e5e7eb] shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider border-b border-gray-100 pb-2">
          Statement Balance Breakdown
        </h4>

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500 font-medium">Total Semester Fee</span>
          <span className="font-bold text-gray-800 text-sm">{formatINR(feeRecord.total)}</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-emerald-600 font-medium">Amount Received</span>
          <span className="font-bold text-emerald-700 text-sm">{formatINR(feeRecord.paid)}</span>
        </div>

        <div className="h-px bg-gray-100" />

        <div className="flex justify-between items-center text-xs pt-1">
          <span className="text-rose-600 font-bold">Pending Outstanding Balance</span>
          <span className="font-extrabold text-rose-700 text-base">
            {formatINR(feeRecord.pending)}
          </span>
        </div>
      </div>
    </AppShell>
  );
}
