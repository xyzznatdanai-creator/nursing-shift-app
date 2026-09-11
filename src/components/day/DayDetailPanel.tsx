"use client";

import { useState } from "react";
import { formatThaiDate, formatTime, isOvernightShift, type ShiftRow } from "@/lib/shift-time";
import { buildDailyTimeline, computeFreeGaps, minutesToLabel, type ActivityRow } from "@/lib/day-plan";
import { checkActivityConflict, summarizeDayConflicts } from "@/lib/schedule-analytics";
import ShiftBadge from "@/components/shifts/ShiftBadge";
import DailyTimeline from "./DailyTimeline";

export default function DayDetailPanel({
  selectedDate,
  dayShifts,
  dayActivities,
  onAddShift,
  onEditShift,
  onDeleteShift,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
}: {
  selectedDate: string;
  dayShifts: ShiftRow[];
  dayActivities: ActivityRow[];
  onAddShift: () => void;
  onEditShift: (shift: ShiftRow) => void;
  onDeleteShift: (shift: ShiftRow) => void;
  onAddActivity: () => void;
  onEditActivity: (activity: ActivityRow) => void;
  onDeleteActivity: (activity: ActivityRow) => void;
}) {
  const [subView, setSubView] = useState<"list" | "timeline">("list");

  const sortedShifts = [...dayShifts].sort((a, b) =>
    formatTime(a.start_time) < formatTime(b.start_time) ? -1 : 1
  );
  const sortedActivities = [...dayActivities].sort((a, b) =>
    formatTime(a.start_time) < formatTime(b.start_time) ? -1 : 1
  );
  const freeGaps = computeFreeGaps(dayShifts, dayActivities);

  const shiftTypeByBlockId = new Map(dayShifts.map((s) => [s.id, s.shift_type]));
  const timelineBlocks = buildDailyTimeline(dayShifts, dayActivities);
  const conflictSummary = summarizeDayConflicts(dayShifts, dayActivities);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{formatThaiDate(selectedDate)}</h3>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setSubView("list")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              subView === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            รายการ
          </button>
          <button
            type="button"
            onClick={() => setSubView("timeline")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              subView === "timeline" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            ไทม์ไลน์
          </button>
        </div>
      </div>

      {dayShifts.length > 0 || dayActivities.length > 0 ? (
        <p className="mb-3 text-xs text-slate-500">
          วันนี้มีเวร {dayShifts.length} รายการ · กิจกรรม {dayActivities.length} รายการ ·{" "}
          {conflictSummary.level === "none" ? (
            <span className="font-medium text-emerald-700">✓ ไม่มีตารางชนกัน</span>
          ) : (
            <span className="font-medium text-red-700">
              ⚠️ มีตารางชนกัน {conflictSummary.conflictCount} รายการ
            </span>
          )}
        </p>
      ) : null}

      {subView === "timeline" ? (
        <DailyTimeline blocks={timelineBlocks} shiftTypeByBlockId={shiftTypeByBlockId} />
      ) : (
        <div className="flex flex-col gap-5">
          {/* เวร */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">เวร</h4>
              <button
                type="button"
                onClick={onAddShift}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                + เพิ่มเวร
              </button>
            </div>
            {sortedShifts.length === 0 ? (
              <p className="text-sm text-slate-400">ไม่มีเวรวันนี้</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sortedShifts.map((shift) => {
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
                          onClick={() => onEditShift(shift)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteShift(shift)}
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

          {/* กิจกรรม */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">กิจกรรม</h4>
              <button
                type="button"
                onClick={onAddActivity}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                + เพิ่มกิจกรรม
              </button>
            </div>
            {sortedActivities.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีกิจกรรม</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sortedActivities.map((activity) => {
                  const conflict = checkActivityConflict(activity, dayShifts);
                  return (
                    <li
                      key={activity.id}
                      className="flex flex-col gap-2 rounded-lg border border-violet-100 bg-violet-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-0.5 text-xs font-semibold text-violet-700">
                            📌 {activity.title}
                          </span>
                          <span className="text-xs text-slate-600">
                            {formatTime(activity.start_time)} – {formatTime(activity.end_time)}
                          </span>
                          {conflict.level === "full" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                              🔴 ซ้อนกับเวร
                              {conflict.overlapStart != null && conflict.overlapEnd != null
                                ? ` ${minutesToLabel(conflict.overlapStart)}–${minutesToLabel(conflict.overlapEnd)}`
                                : ""}
                            </span>
                          ) : conflict.level === "partial" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
                              🟠 ซ้อนบางส่วน
                              {conflict.overlapStart != null && conflict.overlapEnd != null
                                ? ` ${minutesToLabel(conflict.overlapStart)}–${minutesToLabel(conflict.overlapEnd)}`
                                : ""}
                            </span>
                          ) : null}
                        </div>
                        {activity.notes ? (
                          <div className="text-xs text-slate-500">{activity.notes}</div>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEditActivity(activity)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteActivity(activity)}
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

          {/* เวลาว่าง */}
          {dayShifts.length > 0 || dayActivities.length > 0 ? (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                เวลาว่าง
              </h4>
              {freeGaps.length === 0 ? (
                <p className="text-sm text-slate-400">ไม่มีเวลาว่างเหลือในวันนี้</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {freeGaps.map((g) => (
                    <span
                      key={`${g.start}-${g.end}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                    >
                      🟢 {minutesToLabel(g.start)}–{minutesToLabel(g.end)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
