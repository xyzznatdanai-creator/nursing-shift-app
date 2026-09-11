"use server";

import { createClient } from "@/lib/supabase/server";
import { translateDbError } from "@/lib/db-errors";
import { REMINDER_PRESETS } from "@/lib/reminder";

export interface NotificationSettingsRow {
  shift_reminder_enabled: boolean;
  shift_reminder_minutes: number;
  activity_reminder_enabled: boolean;
  activity_reminder_minutes: number;
  conflict_notification_enabled: boolean;
}

const ALLOWED_MINUTES = new Set(REMINDER_PRESETS.map((p) => p.minutes));

function validate(input: NotificationSettingsRow): string | null {
  if (!ALLOWED_MINUTES.has(input.shift_reminder_minutes)) return "ระยะเวลาแจ้งเตือนเวรไม่ถูกต้อง";
  if (!ALLOWED_MINUTES.has(input.activity_reminder_minutes)) return "ระยะเวลาแจ้งเตือนกิจกรรมไม่ถูกต้อง";
  return null;
}

export async function updateNotificationSettings(
  input: NotificationSettingsRow
): Promise<{ error?: string }> {
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  const { error } = await supabase.from("notification_settings").upsert({
    user_id: user.id,
    shift_reminder_enabled: input.shift_reminder_enabled,
    shift_reminder_minutes: input.shift_reminder_minutes,
    activity_reminder_enabled: input.activity_reminder_enabled,
    activity_reminder_minutes: input.activity_reminder_minutes,
    conflict_notification_enabled: input.conflict_notification_enabled,
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: translateDbError(error.message) };
  return {};
}
