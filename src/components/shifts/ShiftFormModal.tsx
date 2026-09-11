"use client";

import { useState, type FormEvent } from "react";
import { SHIFT_TYPES } from "@/lib/shift-types";
import { isOvernightShift } from "@/lib/shift-time";
import { createShift, updateShift, type ShiftInput } from "@/app/shifts/actions";
import SubmitButton from "@/components/SubmitButton";

export interface EditableShift {
  id: string;
  shift_date: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export default function ShiftFormModal({
  shift,
  defaultDate,
  onClose,
  onSaved,
}: {
  shift?: EditableShift;
  defaultDate?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = !!shift;

  const [date, setDate] = useState(shift?.shift_date ?? defaultDate ?? "");
  const [shiftType, setShiftType] = useState(shift?.shift_type ?? SHIFT_TYPES[0].value);
  const [startTime, setStartTime] = useState(shift?.start_time?.slice(0, 5) ?? "08:00");
  const [endTime, setEndTime] = useState(shift?.end_time?.slice(0, 5) ?? "16:00");
  const [notes, setNotes] = useState(shift?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const overnight = startTime && endTime ? isOvernightShift(startTime, endTime) : false;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!date) {
      setError("กรุณาเลือกวันที่");
      return;
    }

    const input: ShiftInput = {
      shift_date: date,
      shift_type: shiftType,
      start_time: startTime,
      end_time: endTime,
      notes,
    };

    setLoading(true);
    try {
      const result = isEdit ? await updateShift(shift!.id, input) : await createShift(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved(isEdit ? "แก้ไขเวรสำเร็จ" : "เพิ่มเวรสำเร็จ");
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
      aria-labelledby="shift-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 id="shift-form-title" className="text-lg font-semibold text-slate-900">
          {isEdit ? "แก้ไขเวร" : "เพิ่มเวร"}
        </h2>

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
            <label htmlFor="shift-date" className="mb-1.5 block text-sm font-medium text-slate-700">
              วันที่
            </label>
            <input
              id="shift-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div>
            <label htmlFor="shift-type" className="mb-1.5 block text-sm font-medium text-slate-700">
              ประเภทเวร
            </label>
            <select
              id="shift-type"
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              disabled={loading}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
            >
              {SHIFT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.value}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="shift-start" className="mb-1.5 block text-sm font-medium text-slate-700">
                เวลาเริ่ม
              </label>
              <input
                id="shift-start"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={loading}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <div>
              <label htmlFor="shift-end" className="mb-1.5 block text-sm font-medium text-slate-700">
                เวลาสิ้นสุด
              </label>
              <input
                id="shift-end"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={loading}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
          </div>

          {overnight ? (
            <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-800">
              <span aria-hidden="true">🌙</span>
              เวรนี้ข้ามวัน — จะสิ้นสุดในเช้าวันถัดไป
            </div>
          ) : null}

          <div>
            <label htmlFor="shift-notes" className="mb-1.5 block text-sm font-medium text-slate-700">
              หมายเหตุ <span className="font-normal text-slate-400">(ถ้ามี)</span>
            </label>
            <textarea
              id="shift-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              placeholder="เช่น เวรพิเศษ, สลับกับเพื่อนร่วมงาน"
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
