import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LiveClock from "@/components/LiveClock";
import AppNav from "@/components/AppNav";
import ShiftBadge from "@/components/shifts/ShiftBadge";
import { formatTime, isOvernightShift, todayInBangkok, type ShiftRow } from "@/lib/shift-time";

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

  // Row Level Security on `shifts` means this can only ever return *this*
  // user's rows — there is no way to see another account's schedule here.
  const { data, error: shiftsError } = await supabase
    .from("shifts")
    .select("id, shift_date, shift_type, start_time, end_time, notes")
    .eq("shift_date", today)
    .order("start_time", { ascending: true });

  const todaysShifts = (data ?? []) as ShiftRow[];

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
            <h2 className="text-sm font-semibold text-slate-900">เวรวันนี้</h2>
            <Link
              href="/shifts"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline"
            >
              ไปที่ตารางเวร →
            </Link>
          </div>

          {shiftsError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              ไม่สามารถโหลดข้อมูลตารางเวรได้ในขณะนี้ กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง
            </div>
          ) : todaysShifts.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">วันนี้ไม่มีเวร</p>
              <Link
                href="/shifts"
                className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
              >
                + เพิ่มเวร
              </Link>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
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
                        <span className="ml-1.5 text-xs font-medium text-indigo-600">🌙 ข้ามวัน</span>
                      ) : null}
                    </span>
                  </div>
                  {shift.notes ? <p className="text-xs text-slate-500">{shift.notes}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
