import { computeMonthlyOverview } from "@/lib/schedule-analytics";
import { getShiftTypeDef } from "@/lib/shift-types";
import type { ShiftRow } from "@/lib/shift-time";
import type { ActivityRow } from "@/lib/day-plan";

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

export default function MonthlyOverview({
  year,
  month0,
  monthShifts,
  monthActivities,
}: {
  year: number;
  month0: number;
  monthShifts: ShiftRow[];
  monthActivities: ActivityRow[];
}) {
  const overview = computeMonthlyOverview(year, month0, monthShifts, monthActivities);
  const isEmpty = monthShifts.length === 0 && monthActivities.length === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        ภาพรวม{MONTH_LABELS[month0]} {year}
      </h3>

      {isEmpty ? (
        <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีตารางสำหรับวิเคราะห์</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2">
            <p className="text-xs text-red-700">🔴 วันทำงาน</p>
            <p className="text-lg font-semibold text-red-800">{overview.workDays} วัน</p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
            <p className="text-xs text-emerald-700">🟢 วันไม่มีเวร</p>
            <p className="text-lg font-semibold text-emerald-800">{overview.nonWorkDays} วัน</p>
          </div>
          <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2">
            <p className="text-xs text-violet-700">📌 กิจกรรม</p>
            <p className="text-lg font-semibold text-violet-800">{overview.activityCount} รายการ</p>
          </div>

          {overview.shiftTypeCounts.map((t) => (
            <div key={t.value} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">
                {getShiftTypeDef(t.value).emoji} {t.value}
              </p>
              <p className="text-lg font-semibold text-slate-800">
                {t.count} {t.value === "หยุด" ? "วัน" : "เวร"}
              </p>
            </div>
          ))}

          <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
            <p className="text-xs text-amber-700">⚠️ เวลาชนกัน</p>
            <p className="text-lg font-semibold text-amber-800">{overview.conflictCount} รายการ</p>
          </div>
        </div>
      )}
    </div>
  );
}
