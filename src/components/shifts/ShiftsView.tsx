"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatThaiDate, todayInBangkok, type ShiftRow } from "@/lib/shift-time";
import type { ActivityRow } from "@/lib/day-plan";
import { deleteShift } from "@/app/shifts/actions";
import { deleteActivity } from "@/app/activities/actions";
import ShiftList from "./ShiftList";
import ShiftCalendar from "./ShiftCalendar";
import ShiftFormModal, { type EditableShift } from "./ShiftFormModal";
import ActivityFormModal, { type EditableActivity } from "@/components/activities/ActivityFormModal";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";

type ShiftModalState =
  | { mode: "add"; defaultDate?: string }
  | { mode: "edit"; shift: EditableShift }
  | null;

type ActivityModalState =
  | { mode: "add"; defaultDate?: string }
  | { mode: "edit"; activity: EditableActivity }
  | null;

export default function ShiftsView({
  shifts,
  activities,
}: {
  shifts: ShiftRow[];
  activities: ActivityRow[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "calendar">("list");

  const [shiftModal, setShiftModal] = useState<ShiftModalState>(null);
  const [shiftDeleteTarget, setShiftDeleteTarget] = useState<ShiftRow | null>(null);

  const [activityModal, setActivityModal] = useState<ActivityModalState>(null);
  const [activityDeleteTarget, setActivityDeleteTarget] = useState<ActivityRow | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  function handleShiftSaved(message: string) {
    setShiftModal(null);
    setToast(message);
    router.refresh();
  }

  async function handleConfirmDeleteShift() {
    if (!shiftDeleteTarget) return;
    const result = await deleteShift(shiftDeleteTarget.id);
    if (result.error) {
      throw new Error(result.error);
    }
    setShiftDeleteTarget(null);
    setToast("ลบเวรสำเร็จ");
    router.refresh();
  }

  function handleActivitySaved(message: string) {
    setActivityModal(null);
    setToast(message);
    router.refresh();
  }

  async function handleConfirmDeleteActivity() {
    if (!activityDeleteTarget) return;
    const result = await deleteActivity(activityDeleteTarget.id);
    if (result.error) {
      throw new Error(result.error);
    }
    setActivityDeleteTarget(null);
    setToast("ลบกิจกรรมสำเร็จ");
    router.refresh();
  }

  // Shifts for the date currently open in the activity form — drives the
  // "⚠️ วันนี้มีเวร" context callout inside that modal.
  const activityFormDate =
    activityModal?.mode === "edit"
      ? activityModal.activity.activity_date
      : activityModal?.mode === "add"
      ? activityModal.defaultDate ?? ""
      : "";
  const activityFormDayShifts = shifts.filter((s) => s.shift_date === activityFormDate);

  const hasNoData = shifts.length === 0 && activities.length === 0;

  if (hasNoData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-base font-semibold text-slate-700">ยังไม่มีตารางเวร</p>
        <p className="mt-1 max-w-xs text-sm text-slate-400">
          เพิ่มเวรแรกของคุณเพื่อเริ่มจัดการตารางเวร
        </p>
        <button
          type="button"
          onClick={() => setShiftModal({ mode: "add", defaultDate: todayInBangkok() })}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          + เพิ่มเวร
        </button>

        {shiftModal ? (
          <ShiftFormModal
            shift={shiftModal.mode === "edit" ? shiftModal.shift : undefined}
            defaultDate={shiftModal.mode === "add" ? shiftModal.defaultDate : undefined}
            onClose={() => setShiftModal(null)}
            onSaved={handleShiftSaved}
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

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActivityModal({ mode: "add", defaultDate: todayInBangkok() })}
            className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-100"
          >
            + เพิ่มกิจกรรม
          </button>
          <button
            type="button"
            onClick={() => setShiftModal({ mode: "add", defaultDate: todayInBangkok() })}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            + เพิ่มเวร
          </button>
        </div>
      </div>

      {view === "list" ? (
        <ShiftList
          shifts={shifts}
          onEdit={(s) => setShiftModal({ mode: "edit", shift: s })}
          onDeleteRequest={(s) => setShiftDeleteTarget(s)}
        />
      ) : (
        <ShiftCalendar
          shifts={shifts}
          activities={activities}
          onAddShiftForDate={(date) => setShiftModal({ mode: "add", defaultDate: date })}
          onEditShift={(s) => setShiftModal({ mode: "edit", shift: s })}
          onDeleteShiftRequest={(s) => setShiftDeleteTarget(s)}
          onAddActivityForDate={(date) => setActivityModal({ mode: "add", defaultDate: date })}
          onEditActivity={(a) => setActivityModal({ mode: "edit", activity: a })}
          onDeleteActivityRequest={(a) => setActivityDeleteTarget(a)}
        />
      )}

      {shiftModal ? (
        <ShiftFormModal
          shift={shiftModal.mode === "edit" ? shiftModal.shift : undefined}
          defaultDate={shiftModal.mode === "add" ? shiftModal.defaultDate : undefined}
          onClose={() => setShiftModal(null)}
          onSaved={handleShiftSaved}
        />
      ) : null}

      {activityModal ? (
        <ActivityFormModal
          activity={activityModal.mode === "edit" ? activityModal.activity : undefined}
          defaultDate={activityModal.mode === "add" ? activityModal.defaultDate : undefined}
          dayShifts={activityFormDayShifts}
          onClose={() => setActivityModal(null)}
          onSaved={handleActivitySaved}
        />
      ) : null}

      {shiftDeleteTarget ? (
        <ConfirmDialog
          title="ต้องการลบเวรนี้หรือไม่?"
          message={`เวรวันที่ ${formatThaiDate(shiftDeleteTarget.shift_date)} (${shiftDeleteTarget.shift_type}) จะถูกลบอย่างถาวร`}
          confirmLabel="ลบเวร"
          danger
          onConfirm={handleConfirmDeleteShift}
          onCancel={() => setShiftDeleteTarget(null)}
        />
      ) : null}

      {activityDeleteTarget ? (
        <ConfirmDialog
          title="ต้องการลบกิจกรรมนี้หรือไม่?"
          message={`กิจกรรม "${activityDeleteTarget.title}" วันที่ ${formatThaiDate(
            activityDeleteTarget.activity_date
          )} จะถูกลบอย่างถาวร`}
          confirmLabel="ลบกิจกรรม"
          danger
          onConfirm={handleConfirmDeleteActivity}
          onCancel={() => setActivityDeleteTarget(null)}
        />
      ) : null}

      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </div>
  );
}
