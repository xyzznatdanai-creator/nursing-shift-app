"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatThaiDate, todayInBangkok, type ShiftRow } from "@/lib/shift-time";
import { deleteShift } from "@/app/shifts/actions";
import ShiftList from "./ShiftList";
import ShiftCalendar from "./ShiftCalendar";
import ShiftFormModal, { type EditableShift } from "./ShiftFormModal";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";

type ModalState = { mode: "add"; defaultDate?: string } | { mode: "edit"; shift: EditableShift } | null;

export default function ShiftsView({ shifts }: { shifts: ShiftRow[] }) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [modal, setModal] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function handleSaved(message: string) {
    setModal(null);
    setToast(message);
    router.refresh();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const result = await deleteShift(deleteTarget.id);
    if (result.error) {
      throw new Error(result.error);
    }
    setDeleteTarget(null);
    setToast("ลบเวรสำเร็จ");
    router.refresh();
  }

  if (shifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-base font-semibold text-slate-700">ยังไม่มีตารางเวร</p>
        <p className="mt-1 max-w-xs text-sm text-slate-400">
          เพิ่มเวรแรกของคุณเพื่อเริ่มจัดการตารางเวร
        </p>
        <button
          type="button"
          onClick={() => setModal({ mode: "add", defaultDate: todayInBangkok() })}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          + เพิ่มเวร
        </button>

        {modal ? (
          <ShiftFormModal
            shift={modal.mode === "edit" ? modal.shift : undefined}
            defaultDate={modal.mode === "add" ? modal.defaultDate : undefined}
            onClose={() => setModal(null)}
            onSaved={handleSaved}
          />
        ) : null}
        {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              view === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            รายการ
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              view === "calendar" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ปฏิทิน
          </button>
        </div>

        <button
          type="button"
          onClick={() => setModal({ mode: "add", defaultDate: todayInBangkok() })}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          + เพิ่มเวร
        </button>
      </div>

      {view === "list" ? (
        <ShiftList
          shifts={shifts}
          onEdit={(s) => setModal({ mode: "edit", shift: s })}
          onDeleteRequest={(s) => setDeleteTarget(s)}
        />
      ) : (
        <ShiftCalendar
          shifts={shifts}
          onAddForDate={(date) => setModal({ mode: "add", defaultDate: date })}
          onEdit={(s) => setModal({ mode: "edit", shift: s })}
          onDeleteRequest={(s) => setDeleteTarget(s)}
        />
      )}

      {modal ? (
        <ShiftFormModal
          shift={modal.mode === "edit" ? modal.shift : undefined}
          defaultDate={modal.mode === "add" ? modal.defaultDate : undefined}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="ต้องการลบเวรนี้หรือไม่?"
          message={`เวรวันที่ ${formatThaiDate(deleteTarget.shift_date)} (${deleteTarget.shift_type}) จะถูกลบอย่างถาวร`}
          confirmLabel="ลบเวร"
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}
