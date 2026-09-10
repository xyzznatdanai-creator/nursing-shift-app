import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LiveClock from "@/components/LiveClock";
import LogoutButton from "@/components/LogoutButton";
import { logout } from "./actions";

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

  // Ask the database how many shifts this account has. Row Level Security
  // on the `shifts` table means this can only ever count *this* user's
  // rows — there is no shift-management UI yet in Phase 1, so the count
  // will always be 0 for a brand-new account, which is exactly the point.
  const { count, error: shiftsError } = await supabase
    .from("shifts")
    .select("*", { count: "exact", head: true });

  const hasShifts = typeof count === "number" && count > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Nursing Shift
          </h1>
          <LogoutButton action={logout} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-slate-500">สวัสดี,</p>
        <p className="mb-6 truncate text-xl font-semibold text-slate-900">
          {user.email}
        </p>

        <LiveClock />

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-sm font-semibold text-slate-900">ตารางเวร</h2>

          {shiftsError ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              ไม่สามารถโหลดข้อมูลตารางเวรได้ในขณะนี้ กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง
            </div>
          ) : !hasShifts ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                ยังไม่มีข้อมูล
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-400">
                ระบบจัดการตารางเวรจะเปิดให้ใช้งานในเฟสถัดไป
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              มีข้อมูลตารางเวร {count} รายการ
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
