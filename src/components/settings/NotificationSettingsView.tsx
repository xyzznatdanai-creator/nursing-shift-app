"use client";

import { useEffect, useState, useTransition } from "react";
import { updateNotificationSettings } from "@/app/settings/actions";
import { REMINDER_PRESETS } from "@/lib/reminder";
import { formatThaiDateShort } from "@/lib/shift-time";
import {
  disablePushNotifications,
  enablePushNotifications,
  getNotificationPermission,
  getPushSupportStatus,
  hasActivePushSubscription,
  type PushSupportStatus,
} from "@/lib/push-client";

export interface NotificationSettingsState {
  shift_reminder_enabled: boolean;
  shift_reminder_minutes: number;
  activity_reminder_enabled: boolean;
  activity_reminder_minutes: number;
  conflict_notification_enabled: boolean;
}

export interface NotificationHistoryItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  sent_at: string;
}

function historyTimeLabel(iso: string): string {
  const dt = new Date(iso);
  const dateLabel = formatThaiDateShort(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(dt)
  );
  const timeLabel = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);
  return `${dateLabel} ${timeLabel} น.`;
}

function historyIcon(kind: string): string {
  if (kind === "conflict") return "⚠️";
  return "🔔";
}

/** Toggle switch — a plain styled checkbox, sized for comfortable mobile tapping. */
function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm font-medium text-slate-900">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

export default function NotificationSettingsView({
  initialSettings,
  history,
  vapidPublicKey,
  hasShifts,
  hasActivities,
}: {
  initialSettings: NotificationSettingsState;
  history: NotificationHistoryItem[];
  vapidPublicKey: string;
  hasShifts: boolean;
  hasActivities: boolean;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const [supportStatus, setSupportStatus] = useState<PushSupportStatus | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    // These read browser-only globals (`Notification`, `navigator.serviceWorker`)
    // that don't exist during server rendering, so they can only be read
    // after mount — an effect is the correct place for a one-time,
    // client-only capability check like this (not derived-state antipattern
    // the lint rule usually guards against).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupportStatus(getPushSupportStatus());
    setPermission(getNotificationPermission());
    hasActivePushSubscription().then(setSubscribed);
  }, []);

  function persist(next: NotificationSettingsState) {
    setSettings(next);
    setSaveError(null);
    setJustSaved(false);
    startTransition(async () => {
      const result = await updateNotificationSettings(next);
      if (result.error) {
        setSaveError(result.error);
      } else {
        setJustSaved(true);
      }
    });
  }

  async function handleEnablePush() {
    if (!vapidPublicKey) {
      setPushError("ระบบยังไม่ได้ตั้งค่าการแจ้งเตือนฝั่งเซิร์ฟเวอร์ กรุณาติดต่อผู้ดูแลระบบ");
      return;
    }
    setPushBusy(true);
    setPushError(null);
    const result = await enablePushNotifications(vapidPublicKey);
    setPushBusy(false);
    setPermission(getNotificationPermission());
    if (result.ok) {
      setSubscribed(true);
    } else if (result.error === "denied") {
      setPushError("การแจ้งเตือนถูกปิด — เปิดใช้งานได้จากการตั้งค่าเบราว์เซอร์หากต้องการ");
    } else {
      setPushError("เปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  async function handleDisablePush() {
    setPushBusy(true);
    setPushError(null);
    const result = await disablePushNotifications();
    setPushBusy(false);
    if (result.ok) {
      setSubscribed(false);
    } else {
      setPushError("ปิดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  const overallEnabled =
    supportStatus === "supported" &&
    permission === "granted" &&
    subscribed &&
    (settings.shift_reminder_enabled || settings.activity_reminder_enabled);

  return (
    <div className="mt-6 flex flex-col gap-5">
      {/* --- Master permission / status card --- */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">สถานะการแจ้งเตือน</h2>
          {supportStatus === "supported" ? (
            overallEnabled ? (
              <span className="text-sm font-medium text-emerald-700">✓ เปิดใช้งาน</span>
            ) : (
              <span className="text-sm font-medium text-slate-500">✕ ปิดใช้งาน</span>
            )
          ) : null}
        </div>

        {supportStatus === null ? (
          <p className="mt-3 text-sm text-slate-400">กำลังตรวจสอบอุปกรณ์...</p>
        ) : supportStatus === "unsupported-browser" ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            เบราว์เซอร์หรืออุปกรณ์นี้ไม่รองรับการแจ้งเตือนแบบ Push กรุณาลองใช้ Chrome
            หรือ Edge เวอร์ชันล่าสุดบน Android/Desktop
          </div>
        ) : supportStatus === "ios-needs-home-screen" ? (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-800">
            บน iPhone/iPad ต้องเพิ่มเว็บนี้ไปยังหน้าจอโฮมก่อนจึงจะแจ้งเตือนได้: แตะปุ่ม
            แชร์ (□↑) ใน Safari แล้วเลือก &quot;เพิ่มไปยังหน้าจอโฮม&quot; จากนั้นเปิดแอปจาก
            ไอคอนบนหน้าจอโฮมแล้วกลับมาที่หน้านี้อีกครั้ง
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-600">
              เปิดการแจ้งเตือนเพื่อรับ Reminder ก่อนเข้าเวรและก่อนกิจกรรม แม้ไม่ได้เปิด
              หน้าเว็บนี้ค้างไว้
            </p>

            {permission === "denied" ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
                การแจ้งเตือนถูกปิดไว้ในเบราว์เซอร์ — หากต้องการเปิดอีกครั้ง กรุณาไปที่การตั้งค่า
                เว็บไซต์ของเบราว์เซอร์แล้วอนุญาต Notification สำหรับเว็บนี้
              </div>
            ) : (
              <button
                type="button"
                onClick={subscribed ? handleDisablePush : handleEnablePush}
                disabled={pushBusy}
                className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  subscribed
                    ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                    : "bg-slate-900 text-white hover:bg-slate-700"
                }`}
              >
                {pushBusy ? "กำลังดำเนินการ..." : subscribed ? "ปิดการแจ้งเตือน" : "เปิดการแจ้งเตือน"}
              </button>
            )}

            {pushError ? <p className="mt-2 text-sm text-red-700">{pushError}</p> : null}
          </>
        )}
      </section>

      {/* --- Shift reminder --- */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <Toggle
          checked={settings.shift_reminder_enabled}
          onChange={(value) => persist({ ...settings, shift_reminder_enabled: value })}
          label="Shift Reminder — แจ้งเตือนก่อนเข้าเวร"
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500">แจ้งเตือนก่อนเวลา</span>
          <select
            value={settings.shift_reminder_minutes}
            disabled={!settings.shift_reminder_enabled}
            onChange={(e) =>
              persist({ ...settings, shift_reminder_minutes: Number(e.target.value) })
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {REMINDER_PRESETS.map((p) => (
              <option key={p.minutes} value={p.minutes}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {!hasShifts ? (
          <p className="mt-3 text-xs text-slate-400">ยังไม่มีเวรสำหรับตั้ง Reminder</p>
        ) : null}
      </section>

      {/* --- Activity reminder --- */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <Toggle
          checked={settings.activity_reminder_enabled}
          onChange={(value) => persist({ ...settings, activity_reminder_enabled: value })}
          label="Activity Reminder — แจ้งเตือนก่อนกิจกรรม"
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500">แจ้งเตือนก่อนเวลา</span>
          <select
            value={settings.activity_reminder_minutes}
            disabled={!settings.activity_reminder_enabled}
            onChange={(e) =>
              persist({ ...settings, activity_reminder_minutes: Number(e.target.value) })
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {REMINDER_PRESETS.map((p) => (
              <option key={p.minutes} value={p.minutes}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <Toggle
            checked={settings.conflict_notification_enabled}
            onChange={(value) => persist({ ...settings, conflict_notification_enabled: value })}
            label="แจ้งเตือนเมื่อกิจกรรมชนกับเวร"
          />
        </div>

        {!hasActivities ? (
          <p className="mt-3 text-xs text-slate-400">ยังไม่มีกิจกรรมสำหรับตั้ง Reminder</p>
        ) : null}
      </section>

      <div className="-mt-2 min-h-[1.25rem] text-xs">
        {isPending ? (
          <span className="text-slate-400">กำลังบันทึก...</span>
        ) : saveError ? (
          <span className="text-red-600">{saveError}</span>
        ) : justSaved ? (
          <span className="text-emerald-600">บันทึกการตั้งค่าแล้ว</span>
        ) : null}
      </div>

      {/* --- History --- */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">ประวัติการแจ้งเตือนล่าสุด</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">ยังไม่มีประวัติการแจ้งเตือน</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-0.5 rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <span className="text-sm text-slate-800">
                  {historyIcon(item.kind)} {item.title}
                </span>
                <span className="text-xs text-slate-500">
                  {item.body} · {historyTimeLabel(item.sent_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
