import { formatThaiDate, formatTime, isOvernightShift, sortShifts, type ShiftRow } from "@/lib/shift-time";
import ShiftBadge from "./ShiftBadge";

export default function ShiftList({
  shifts,
  onEdit,
  onDeleteRequest,
}: {
  shifts: ShiftRow[];
  onEdit: (shift: ShiftRow) => void;
  onDeleteRequest: (shift: ShiftRow) => void;
}) {
  const sorted = sortShifts(shifts);

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((shift) => {
        const overnight = isOvernightShift(shift.start_time, shift.end_time);
        return (
          <li
            key={shift.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {formatThaiDate(shift.shift_date)}
                </span>
                <ShiftBadge shiftType={shift.shift_type} />
              </div>
              <div className="text-sm text-slate-600">
                {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                {overnight ? (
                  <span className="ml-1.5 text-xs font-medium text-indigo-600">🌙 ข้ามวัน</span>
                ) : null}
              </div>
              {shift.notes ? (
                <div className="text-xs text-slate-500">{shift.notes}</div>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => onEdit(shift)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={() => onDeleteRequest(shift)}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                ลบ
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
