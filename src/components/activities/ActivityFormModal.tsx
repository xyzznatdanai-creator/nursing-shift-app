"use client";

import { useState, type FormEvent } from "react";
import { formatTime, formatThaiDate, type ShiftRow } from "@/lib/shift-time";
import { getShiftTypeDef } from "@/lib/shift-types";
import { activityOverlapsAnyShift } from "@/lib/day-plan";
import { createActivity, updateActivity, type ActivityInput } from "@/app/activities/actions";
import SubmitButton from "@/components/SubmitButton";

export interface EditableActivity {
  id: string;
  activity_date: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export default function ActivityFormModal({
  activity,
  defaultDate,
  dayShifts,
  onClose,
  onSaved,
}: {
  activity?: EditableActivity;
  defaultDate?: string;
  /** Shifts already scheduled on the date currently selected in the form — used for the overlap warning. */
  dayShifts: ShiftRow[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = !!activity;

  const [date, setDate] = useState(activity?.activity_date ?? defaultDate ?? "");
  const [title, setTitle] = useState(activity?.title ?? "");
  const [startTime, setStartTime] = useState(activity?.start_time?.slice(0, 5) ?? "18:00");
  const [endTime, setEndTime] = useState(activity?.end_time?.slice(0, 5) ?? "20:00");
  const [notes, setNotes] = useState(activity?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const overlapsShift =
    startTime && endTime ? activityOverlapsAnyShift(startTime, endTime, dayShifts) : false;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError("กรุณาเลือกวันที่");
      return;
    }

    const input: ActivityInput = {
      activity_date: date,
      title,
      start_time: startTime,
      end_time: endTime,
      notes,
    };

    setLoading(true);
    try {
      const result = isEdit
        ? await updateActivity(activity!.id, input)
        : await createActivity(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved(isEdit ? "แก้ไขกิจกรรมสำเร็จ" : "เพิ่มกิจกรรมสำเร็จ");
    } catch {
      setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 id="activity-form-title" className="text-lg font-semibold text-slate-900">
          {isEdit ? "แก้ไขกิจกรรม" : "เพิ่มกิจกรรม"}
        </h2>

        {dayShifts.length > 0 ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800">
              ⚠️ วันที่ {formatThaiDate(date || dayShifts[0].shift_date)} มีเวร
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {dayShifts.map((s) => (
                <li key={s.id} className="flex items-center gap-1.5 text-xs text-amber-800">
                  <span aria-hidden="true">{getShiftTypeDef(s.shift_type).emoji}</span>
                  {s.shift_type} {formatTime(s.start_time)}–{formatTime(s.end_time)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="activity-title" className="mb-1.5 block text-sm font-medium text-slate-700">
              ชื่อกิจกรรม
            </label>
            <input
              id="activity-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              placeholder="เช่น นัดกินข้าวกับเพื่อน"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div>
            <label htmlFor="activity-date" className="mb-1.5 block text-sm font-medium text-slate-700">
              วันที่
            </label>
            <input
              id="activity-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="activity-start" className="mb-1.5 block text-sm font-medium text-slate-700">
                เวลาเริ่ม
              </label>
              <input
                id="activity-start"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={loading}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div>
              <label htmlFor="activity-end" className="mb-1.5 block text-sm font-medium text-slate-700">
                เวลาสิ้นสุด
              </label>
              <input
                id="activity-end"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={loading}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          {overlapsShift ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              <span aria-hidden="true">⚠️</span>
              กิจกรรมนี้อยู่ในช่วงเวลาที่มีเวร
            </div>
          ) : null}

          <div>
            <label htmlFor="activity-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
              หมายเหตุ <span className="font-normal text-slate-400">(ถ้ามี)</span>
            </label>
            <textarea
              id="activity-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              placeholder="เช่น นัดที่ร้านอาหารใกล้บ้าน"
              className="block w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ยกเลิก
            </button>
            <div className="flex-1">
              <SubmitButton loading={loading} loadingText="กำลังบันทึก...">
                บันทึก
              </SubmitButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
