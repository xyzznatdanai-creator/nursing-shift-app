import { formatTime, type ShiftRow } from "@/lib/shift-time";
import type { ActivityRow } from "@/lib/day-plan";
import { checkActivityConflict, shortDateLabel } from "@/lib/schedule-analytics";

export default function UpcomingActivities({
  activities,
  shiftsByDate,
}: {
  activities: ActivityRow[];
  /** Shifts grouped by date, for the same window — used for the conflict badge. */
  shiftsByDate: Map<string, ShiftRow[]>;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">กิจกรรมถัดไป</h2>

      {activities.length === 0 ? (
        <p className="text-sm text-slate-400">ยังไม่มีกิจกรรม</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {activities.map((activity) => {
            const conflict = checkActivityConflict(activity, shiftsByDate.get(activity.activity_date) ?? []);
            return (
              <li
                key={activity.id}
                className="flex flex-col gap-1 rounded-lg border border-violet-100 bg-violet-50/60 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-0.5 text-xs font-semibold text-violet-700">
                    📌 {activity.title}
                  </span>
                  <span className="text-sm text-slate-700">
                    {shortDateLabel(activity.activity_date)} {formatTime(activity.start_time)}–
                    {formatTime(activity.end_time)}
                  </span>
                  {conflict.level === "full" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                      🔴 ซ้อนกับเวร
                    </span>
                  ) : conflict.level === "partial" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
                      🟠 ซ้อนบางส่วน
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
