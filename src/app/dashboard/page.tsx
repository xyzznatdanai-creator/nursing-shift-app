import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LiveClock from "@/components/LiveClock";
import AppNav from "@/components/AppNav";
import ShiftBadge from "@/components/shifts/ShiftBadge";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";
import UpcomingActivities from "@/components/dashboard/UpcomingActivities";
import { formatTime, isOvernightShift, todayInBangkok, type ShiftRow } from "@/lib/shift-time";
import { computeFreeGaps, minutesToLabel, type ActivityRow } from "@/lib/day-plan";
import { addDaysISO, buildUpcomingSchedule, summarizeDayConflicts } from "@/lib/schedule-analytics";

const UPCOMING_WINDOW_DAYS = 7;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route, but a Server Component should
  // never trust that alone — verify again before rendering anything.
  if (!user) {
    redirect("/login");
  }

  const today = todayInBangkok();
  const windowEnd = addDaysISO(today, UPCOMING_WINDOW_DAYS - 1);

  // A single 7-day-window query per table covers "today" AND "what's coming
  // up" — no need for a separate today-only query, which keeps this page
  // at exactly 2 database round-trips. Row Level Security means these can
  // only ever return *this* user's rows.
  const [shiftsResult, activitiesResult] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, shift_date, shift_type, start_time, end_time, notes")
      .gte("shift_date", today)
      .lte("shift_date", windowEnd)
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("activities")
      .select("id, activity_date, title, start_time, end_time, notes")
      .gte("activity_date", today)
      .lte("activity_date", windowEnd)
      .order("activity_date", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  const windowShifts = (shiftsResult.data ?? []) as ShiftRow[];
  const windowActivities = (activitiesResult.data ?? []) as ActivityRow[];
  const loadError = shiftsResult.error || activitiesResult.error;

  const todaysShifts = windowShifts.filter((s) => s.shift_date === today);
  const todaysActivities = windowActivities.filter((a) => a.activity_date === today);

  const hasAnything = todaysShifts.length > 0 || todaysActivities.length > 0;
  const freeGaps = hasAnything ? computeFreeGaps(todaysShifts, todaysActivities) : [];
  const conflictSummary = summarizeDayConflicts(todaysShifts, todaysActivities);

  const upcomingDays = buildUpcomingSchedule(today, windowShifts, UPCOMING_WINDOW_DAYS);

  const shiftsByDate = new Map<string, ShiftRow[]>();
  for (const s of windowShifts) {
    const arr = shiftsByDate.get(s.shift_date) ?? [];
    arr.push(s);
    shiftsByDate.set(s.shift_date, arr);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav active="dashboard" />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-slate-500">สวัสดี,</p>
        <p className="mb-6 truncate text-xl font-semibold text-slate-900">
          {user.email}
        </p>

        <LiveClock />

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">สรุปวันนี้</h2>
            <Link
              href="/shifts"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline"
            >
              ไปที่ตารางเวร →
            </Link>
          </div>

          {loadError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง
            </div>
          ) : !hasAnything ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">วันนี้ยังไม่มีตาราง</p>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/shifts"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  + เพิ่มเวร
                </Link>
                <Link
                  href="/shifts"
                  className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                >
                  + เพิ่มกิจกรรม
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-5">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  เวร
                </h3>
                {todaysShifts.length === 0 ? (
                  <p className="text-sm text-slate-500">วันนี้ไม่มีเวร</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {todaysShifts.map((shift) => (
                      <li
                        key={shift.id}
                        className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <ShiftBadge shiftType={shift.shift_type} />
                          <span className="text-sm text-slate-700">
                            {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                            {isOvernightShift(shift.start_time, shift.end_time) ? (
                              <span className="ml-1.5 text-xs font-medium text-indigo-600">
                                🌙 ข้ามวัน
                              </span>
                            ) : null}
                          </span>
                        </div>
                        {shift.notes ? <p className="text-xs text-slate-500">{shift.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {todaysActivities.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    กิจกรรม
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {todaysActivities.map((activity) => (
                      <li
                        key={activity.id}
                        className="flex flex-col gap-1 rounded-lg border border-violet-100 bg-violet-50/60 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-0.5 text-xs font-semibold text-violet-700">
                            📌 {activity.title}
                          </span>
                          <span className="text-sm text-slate-700">
                            {formatTime(activity.start_time)} – {formatTime(activity.end_time)}
                          </span>
                        </div>
                        {activity.notes ? (
                          <p className="text-xs text-slate-500">{activity.notes}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  สถานะ
                </h3>
                {conflictSummary.level === "none" ? (
                  <p className="text-sm font-medium text-emerald-700">✓ ไม่มีตารางชนกัน</p>
                ) : (
                  <p className="text-sm font-medium text-red-700">
                    ⚠️ มีตารางชนกัน {conflictSummary.conflictCount} รายการ
                  </p>
                )}
              </div>

              {freeGaps.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    เวลาว่าง
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {freeGaps.map((g) => (
                      <span
                        key={`${g.start}-${g.end}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                      >
                        🟢 {minutesToLabel(g.start)}
                        {g.end >= 24 * 60 ? " เป็นต้นไป" : `–${minutesToLabel(g.end)}`}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {loadError ? null : (
          <div className="mt-6 flex flex-col gap-6">
            <UpcomingSchedule days={upcomingDays} />
            <UpcomingActivities
              activities={windowActivities.filter((a) => a.activity_date !== today)}
              shiftsByDate={shiftsByDate}
            />
          </div>
        )}
      </main>
    </div>
  );
}
