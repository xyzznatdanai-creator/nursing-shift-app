import webpush from "web-push";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInBangkok, formatTime, type ShiftRow } from "@/lib/shift-time";
import { minutesToLabel, type ActivityRow } from "@/lib/day-plan";
import { addDaysISO, checkActivityConflict } from "@/lib/schedule-analytics";
import { getShiftTypeDef } from "@/lib/shift-types";
import {
  bangkokDateTimeToInstant,
  checkDue,
  shiftDedupKey,
  activityDedupKey,
  conflictDedupKey,
  reminderMinutesLabel,
  DEFAULT_SHIFT_REMINDER_MINUTES,
  DEFAULT_ACTIVITY_REMINDER_MINUTES,
} from "@/lib/reminder";

// Runs as a background job hit by an external scheduler (see README), not
// by any logged-in user's browser — must stay on the Node.js runtime
// (web-push needs Node's crypto), never statically optimized.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NotificationSettingsRow {
  user_id: string;
  shift_reminder_enabled: boolean;
  shift_reminder_minutes: number;
  activity_reminder_enabled: boolean;
  activity_reminder_minutes: number;
  conflict_notification_enabled: boolean;
}

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

interface PendingSend {
  userId: string;
  dedupKey: string;
  kind: "shift" | "activity" | "conflict";
  title: string;
  body: string;
  url: string;
}

const DEFAULT_SETTINGS: Omit<NotificationSettingsRow, "user_id"> = {
  shift_reminder_enabled: true,
  shift_reminder_minutes: DEFAULT_SHIFT_REMINDER_MINUTES,
  activity_reminder_enabled: true,
  activity_reminder_minutes: DEFAULT_ACTIVITY_REMINDER_MINUTES,
  conflict_notification_enabled: true,
};

async function handle(request: NextRequest) {
  const providedSecret = request.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createAdminClient();
  const now = new Date();
  const today = todayInBangkok();
  // 2 days is plenty of lookahead for the largest preset (1 day / 1440 min)
  // even right at midnight, without scanning the user's whole schedule.
  const windowEnd = addDaysISO(today, 2);

  // Only users who have opted in (at least one saved push subscription) are
  // ever considered — nobody can be sent a reminder without having granted
  // notification permission and completed the subscribe flow themselves.
  const { data: subsData, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth_key");
  if (subsError) {
    return NextResponse.json({ error: subsError.message }, { status: 500 });
  }
  const subscriptions = (subsData ?? []) as PushSubscriptionRow[];
  if (subscriptions.length === 0) {
    return NextResponse.json({ checked: 0, due: 0, sent: 0, skipped: 0 });
  }
  const userIds = [...new Set(subscriptions.map((s) => s.user_id))];

  const { data: settingsData } = await supabase
    .from("notification_settings")
    .select(
      "user_id, shift_reminder_enabled, shift_reminder_minutes, activity_reminder_enabled, activity_reminder_minutes, conflict_notification_enabled"
    )
    .in("user_id", userIds);

  const settingsByUser = new Map<string, Omit<NotificationSettingsRow, "user_id">>();
  for (const userId of userIds) settingsByUser.set(userId, DEFAULT_SETTINGS);
  for (const row of (settingsData ?? []) as NotificationSettingsRow[]) {
    settingsByUser.set(row.user_id, row);
  }

  const [{ data: shiftsData }, { data: activitiesData }] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, user_id, shift_date, shift_type, start_time, end_time, notes")
      .in("user_id", userIds)
      .gte("shift_date", today)
      .lte("shift_date", windowEnd),
    supabase
      .from("activities")
      .select("id, user_id, activity_date, title, start_time, end_time, notes")
      .in("user_id", userIds)
      .gte("activity_date", today)
      .lte("activity_date", windowEnd),
  ]);

  const shiftsByUser = new Map<string, (ShiftRow & { user_id: string })[]>();
  for (const s of (shiftsData ?? []) as (ShiftRow & { user_id: string })[]) {
    const arr = shiftsByUser.get(s.user_id) ?? [];
    arr.push(s);
    shiftsByUser.set(s.user_id, arr);
  }
  const activitiesByUser = new Map<string, (ActivityRow & { user_id: string })[]>();
  for (const a of (activitiesData ?? []) as (ActivityRow & { user_id: string })[]) {
    const arr = activitiesByUser.get(a.user_id) ?? [];
    arr.push(a);
    activitiesByUser.set(a.user_id, arr);
  }

  const pending: PendingSend[] = [];

  for (const userId of userIds) {
    const settings = settingsByUser.get(userId) ?? DEFAULT_SETTINGS;
    const userShifts = shiftsByUser.get(userId) ?? [];
    const userActivities = activitiesByUser.get(userId) ?? [];

    const shiftsByDate = new Map<string, ShiftRow[]>();
    for (const s of userShifts) {
      const arr = shiftsByDate.get(s.shift_date) ?? [];
      arr.push(s);
      shiftsByDate.set(s.shift_date, arr);
    }

    if (settings.shift_reminder_enabled) {
      for (const s of userShifts) {
        const instant = bangkokDateTimeToInstant(s.shift_date, s.start_time);
        if (!checkDue(instant, now, settings.shift_reminder_minutes).isDue) continue;
        const typeDef = getShiftTypeDef(s.shift_type);
        pending.push({
          userId,
          dedupKey: shiftDedupKey(s.id, s.shift_date, s.start_time, settings.shift_reminder_minutes),
          kind: "shift",
          title: `อีก ${reminderMinutesLabel(settings.shift_reminder_minutes)} คุณมีเวร${s.shift_type}`,
          body: `${typeDef.emoji} ${formatTime(s.start_time)}–${formatTime(s.end_time)}`,
          url: "/dashboard",
        });
      }
    }

    if (settings.activity_reminder_enabled) {
      for (const a of userActivities) {
        const instant = bangkokDateTimeToInstant(a.activity_date, a.start_time);
        if (!checkDue(instant, now, settings.activity_reminder_minutes).isDue) continue;
        pending.push({
          userId,
          dedupKey: activityDedupKey(a.id, a.activity_date, a.start_time, settings.activity_reminder_minutes),
          kind: "activity",
          title: `อีก ${reminderMinutesLabel(settings.activity_reminder_minutes)} คุณมี${a.title}`,
          body: `📌 ${formatTime(a.start_time)}–${formatTime(a.end_time)}`,
          url: "/shifts",
        });

        if (settings.conflict_notification_enabled) {
          const conflict = checkActivityConflict(a, shiftsByDate.get(a.activity_date) ?? []);
          if (conflict.level !== "none" && conflict.shift) {
            const range =
              conflict.overlapStart != null && conflict.overlapEnd != null
                ? ` (${minutesToLabel(conflict.overlapStart)}–${minutesToLabel(conflict.overlapEnd)})`
                : "";
            pending.push({
              userId,
              dedupKey: conflictDedupKey(
                a.id,
                a.activity_date,
                a.start_time,
                conflict.shift.id,
                conflict.shift.start_time
              ),
              kind: "conflict",
              title: "⚠️ กิจกรรมของคุณซ้อนกับเวร",
              body: `${a.title} ซ้อนกับเวร${conflict.shift.shift_type}${range}`,
              url: "/shifts",
            });
          }
        }
      }
    }
  }

  const subsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const s of subscriptions) {
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push(s);
    subsByUser.set(s.user_id, arr);
  }

  let sent = 0;
  let skipped = 0;
  let deadRemoved = 0;

  for (const item of pending) {
    // Insert-before-send is the de-duplication guard: the unique
    // (user_id, dedup_key) constraint means a second attempt at the same
    // reminder — from this run or a later one — fails here and is skipped,
    // no matter how often the external scheduler calls this endpoint.
    const { error: logError } = await supabase.from("notification_log").insert({
      user_id: item.userId,
      dedup_key: item.dedupKey,
      kind: item.kind,
      title: item.title,
      body: item.body,
    });
    if (logError) {
      skipped += 1;
      continue;
    }

    const userSubs = subsByUser.get(item.userId) ?? [];
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          JSON.stringify({ title: item.title, body: item.body, url: item.url })
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // The browser/OS says this subscription no longer exists (e.g.
          // the user cleared site data) — clean it up so future runs stop
          // wasting a request on it.
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          deadRemoved += 1;
        }
      }
    }
    sent += 1;
  }

  return NextResponse.json({
    checkedUsers: userIds.length,
    due: pending.length,
    sent,
    skipped,
    deadSubscriptionsRemoved: deadRemoved,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
