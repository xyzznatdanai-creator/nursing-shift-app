import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/AppNav";
import ShiftsView from "@/components/shifts/ShiftsView";
import type { ShiftRow } from "@/lib/shift-time";
import type { ActivityRow } from "@/lib/day-plan";

export default async function ShiftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Row Level Security on both tables means these can only ever return
  // *this* user's rows — there is no way to see another account's data here.
  const [shiftsResult, activitiesResult] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, shift_date, shift_type, start_time, end_time, notes")
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("activities")
      .select("id, activity_date, title, start_time, end_time, notes")
      .order("activity_date", { ascending: true })
      .order("start_time", { ascending: true }),
  ]);

  const shifts = (shiftsResult.data ?? []) as ShiftRow[];
  const activities = (activitiesResult.data ?? []) as ActivityRow[];
  const error = shiftsResult.error || activitiesResult.error;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav active="shifts" />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-xl font-bold text-slate-900">ตารางเวร</h1>
        <p className="mb-6 text-sm text-slate-500">
          จัดการตารางเวรและกิจกรรมส่วนตัว — เห็นเฉพาะข้อมูลของบัญชีนี้เท่านั้น
        </p>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง
          </div>
        ) : (
          <ShiftsView shifts={shifts} activities={activities} />
        )}
      </main>
    </div>
  );
}
