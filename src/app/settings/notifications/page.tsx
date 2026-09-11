import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/AppNav";
import NotificationSettingsView, {
  type NotificationHistoryItem,
  type NotificationSettingsState,
} from "@/components/settings/NotificationSettingsView";

const DEFAULT_SETTINGS: NotificationSettingsState = {
  shift_reminder_enabled: true,
  shift_reminder_minutes: 60,
  activity_reminder_enabled: true,
  activity_reminder_minutes: 30,
  conflict_notification_enabled: true,
};

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [settingsResult, historyResult, shiftCountResult, activityCountResult] = await Promise.all([
    supabase
      .from("notification_settings")
      .select(
        "shift_reminder_enabled, shift_reminder_minutes, activity_reminder_enabled, activity_reminder_minutes, conflict_notification_enabled"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("notification_log")
      .select("id, kind, title, body, sent_at")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(20),
    supabase.from("shifts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const loadError =
    settingsResult.error || historyResult.error || shiftCountResult.error || activityCountResult.error;

  const settings: NotificationSettingsState = settingsResult.data ?? DEFAULT_SETTINGS;
  const history = (historyResult.data ?? []) as NotificationHistoryItem[];

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav active="settings" />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900">การแจ้งเตือน</h1>
        <p className="mt-1 text-sm text-slate-500">
          ตั้งเตือนก่อนเข้าเวรและก่อนกิจกรรม โดยไม่ต้องเปิดเว็บค้างไว้ตลอดเวลา
        </p>

        {loadError ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ไม่สามารถโหลดข้อมูลการแจ้งเตือนได้ในขณะนี้ กรุณาลองรีเฟรชหน้าใหม่อีกครั้ง
          </div>
        ) : (
          <NotificationSettingsView
            initialSettings={settings}
            history={history}
            vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
            hasShifts={(shiftCountResult.count ?? 0) > 0}
            hasActivities={(activityCountResult.count ?? 0) > 0}
          />
        )}
      </main>
    </div>
  );
}
