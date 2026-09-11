"use client";

import { useMemo, useState } from "react";
import { todayInBangkok, type ShiftRow } from "@/lib/shift-time";
import { getShiftTypeDef } from "@/lib/shift-types";
import type { ActivityRow } from "@/lib/day-plan";
import DayDetailPanel from "@/components/day/DayDetailPanel";

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
  activities,
  onAddShiftForDate,
  onEditShift,
  onDeleteShiftRequest,
  onAddActivityForDate,
  onEditActivity,
  onDeleteActivityRequest,
}: {
  shifts: ShiftRow[];
  activities: ActivityRow[];
  onAddShiftForDate: (date: string) => void;
  onEditShift: (shift: ShiftRow) => void;
  onDeleteShiftRequest: (shift: ShiftRow) => void;
  onAddActivityForDate: (date: string) => void;
  onEditActivity: (activity: ActivityRow) => void;
  onDeleteActivityRequest: (activity: ActivityRow) => void;
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

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    for (const a of activities) {
      const arr = map.get(a.activity_date) ?? [];
      arr.push(a);
      map.set(a.activity_date, arr);
    }
    return map;
  }, [activities]);

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

  const selectedShifts = shiftsByDate.get(selectedDate) ?? [];
  const selectedActivities = activitiesByDate.get(selectedDate) ?? [];

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
            const dayActivities = activitiesByDate.get(cell.iso) ?? [];
            const isToday = cell.iso === today;
            const isSelected = cell.iso === selectedDate;

            // Up to 4 dots total: shift dots (colored by type) first, then
            // activity dots (violet) — keeps the cell readable even on a
            // busy day instead of listing every single item.
            const dots: Array<{ key: string; className: string }> = [
              ...dayShifts.map((s) => ({
                key: `s-${s.id}`,
                className: getShiftTypeDef(s.shift_type).dotClass,
              })),
              ...dayActivities.map((a) => ({ key: `a-${a.id}`, className: "bg-violet-500" })),
            ].slice(0, 4);

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
                {dots.length > 0 ? (
                  <span className="flex gap-0.5">
                    {dots.map((d) => (
                      <span
                        key={d.key}
                        className={`h-1.5 w-1.5 rounded-full ${isSelected ? "bg-white" : d.className}`}
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

      <DayDetailPanel
        selectedDate={selectedDate}
        dayShifts={selectedShifts}
        dayActivities={selectedActivities}
        onAddShift={() => onAddShiftForDate(selectedDate)}
        onEditShift={onEditShift}
        onDeleteShift={onDeleteShiftRequest}
        onAddActivity={() => onAddActivityForDate(selectedDate)}
        onEditActivity={onEditActivity}
        onDeleteActivity={onDeleteActivityRequest}
      />
    </div>
  );
}
