"use client";

import { useMemo, useState } from "react";
import {
  formatTime,
  formatThaiDate,
  isOvernightShift,
  todayInBangkok,
  type ShiftRow,
} from "@/lib/shift-time";
import { getShiftTypeDef } from "@/lib/shift-types";
import ShiftBadge from "./ShiftBadge";

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTH_LABELS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoOf(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export default function ShiftCalendar({
  shifts,
  onAddForDate,
  onEdit,
  onDeleteRequest,
}: {
  shifts: ShiftRow[];
  onAddForDate: (date: string) => void;
  onEdit: (shift: ShiftRow) => void;
  onDeleteRequest: (shift: ShiftRow) => void;
}) {
  const today = todayInBangkok();
  const [todayY, todayM] = today.split("-").map(Number);

  const [viewYear, setViewYear] = useState(todayY);
  const [viewMonth, setViewMonth] = useState(todayM - 1); // 0-11
  const [selectedDate, setSelectedDate] = useState(today);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftRow[]>();
    for (const s of shifts) {
      const arr = map.get(s.shift_date) ?? [];
      arr.push(s);
      map.set(s.shift_date, arr);
    }
    return map;
  }, [shifts]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const cells: Array<{ day: number; iso: string } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, iso: isoOf(viewYear, viewMonth, d) });

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const selectedShifts = (shiftsByDate.get(selectedDate) ?? []).slice().sort((a, b) =>
    formatTime(a.start_time) < formatTime(b.start_time) ? -1 : 1
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="เดือนก่อนหน้า"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-slate-900">
            {MONTH_LABELS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="เดือนถัดไป"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`blank-${i}`} />;
            const dayShifts = shiftsByDate.get(cell.iso) ?? [];
            const isToday = cell.iso === today;
            const isSelected = cell.iso === selectedDate;
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => setSelectedDate(cell.iso)}
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition-colors ${
                  isSelected
                    ? "bg-slate-900 text-white"
                    : isToday
                    ? "border border-slate-900 text-slate-900"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{cell.day}</span>
                {dayShifts.length > 0 ? (
                  <span className="flex gap-0.5">
                    {dayShifts.slice(0, 3).map((s) => (
                      <span
                        key={s.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          isSelected ? "bg-white" : getShiftTypeDef(s.shift_type).dotClass
                        }`}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="h-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{formatThaiDate(selectedDate)}</h3>
          <button
            type="button"
            onClick={() => onAddForDate(selectedDate)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            + เพิ่มเวร
          </button>
        </div>

        {selectedShifts.length === 0 ? (
          <p className="text-sm text-slate-400">ไม่มีเวรวันนี้</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedShifts.map((shift) => {
              const overnight = isOvernightShift(shift.start_time, shift.end_time);
              return (
                <li
                  key={shift.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <ShiftBadge shiftType={shift.shift_type} />
                      <span className="text-xs text-slate-600">
                        {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                        {overnight ? <span className="ml-1 text-indigo-600">🌙</span> : null}
                      </span>
                    </div>
                    {shift.notes ? <div className="text-xs text-slate-500">{shift.notes}</div> : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(shift)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRequest(shift)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      ลบ
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
