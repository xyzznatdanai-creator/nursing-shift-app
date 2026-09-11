import { formatTime, isOvernightShift } from "@/lib/shift-time";
import { getShiftTypeDef } from "@/lib/shift-types";
import { shortDateLabel, type UpcomingDay } from "@/lib/schedule-analytics";

export default function UpcomingSchedule({ days }: { days: UpcomingDay[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">ตารางที่กำลังจะมาถึง</h2>
      <ul className="flex flex-col gap-2.5">
        {days.map((day) => (
          <li
            key={day.dateISO}
            className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-xs font-semibold text-slate-500">
              {day.label} <span className="font-normal text-slate-400">· {shortDateLabel(day.dateISO)}</span>
            </span>
            {day.shifts.length === 0 ? (
              <span className="text-sm text-emerald-700">🟢 ไม่มีเวร</span>
            ) : (
              <span className="flex flex-wrap gap-2">
                {day.shifts.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 text-sm text-slate-700">
                    {getShiftTypeDef(s.shift_type).emoji} {s.shift_type} {formatTime(s.start_time)}–
                    {formatTime(s.end_time)}
                    {isOvernightShift(s.start_time, s.end_time) ? (
                      <span className="text-xs text-indigo-600">🌙</span>
                    ) : null}
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
