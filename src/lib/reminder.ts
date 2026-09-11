// V1.4 — Reminder & Notification: shared constants + pure time math used by
// both the Settings UI (to render preset choices) and the background
// reminder job (to decide what's due). No React/Next imports here, so this
// file is safe to import from a Route Handler or a Client Component alike.

/** Reminder-offset presets, per spec section 3 — minutes before start. */
export interface ReminderPreset {
  minutes: number;
  label: string;
}

export const REMINDER_PRESETS: ReminderPreset[] = [
  { minutes: 5, label: "5 นาที" },
  { minutes: 15, label: "15 นาที" },
  { minutes: 30, label: "30 นาที" },
  { minutes: 60, label: "1 ชั่วโมง" },
  { minutes: 120, label: "2 ชั่วโมง" },
  { minutes: 1440, label: "1 วัน" },
];

export const DEFAULT_SHIFT_REMINDER_MINUTES = 60;
export const DEFAULT_ACTIVITY_REMINDER_MINUTES = 30;

/** "1 ชั่วโมง" / "30 นาที" / falls back to "N นาที" for a non-preset value. */
export function reminderMinutesLabel(minutes: number): string {
  const preset = REMINDER_PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  if (minutes % 1440 === 0) return `${minutes / 1440} วัน`;
  if (minutes % 60 === 0) return `${minutes / 60} ชั่วโมง`;
  return `${minutes} นาที`;
}

/**
 * Combine a local Asia/Bangkok calendar date + wall-clock time into the
 * exact UTC instant it refers to. Bangkok has never observed daylight
 * saving time, so its UTC offset is always exactly +07:00 — appending that
 * fixed offset directly (rather than going through `Intl`) gives an
 * unambiguous, correct instant with no timezone-database lookup needed.
 *
 * This is deliberately based on the item's *start* time only. A reminder
 * fires "N minutes before this starts" — that moment is well-defined even
 * for an overnight shift (22:00 → 08:00): it is simply 22:00 on
 * `shift_date`, regardless of when the shift ends or which calendar day
 * the end time falls on.
 */
export function bangkokDateTimeToInstant(isoDate: string, time: string): Date {
  const hhmm = time.slice(0, 5);
  return new Date(`${isoDate}T${hhmm}:00+07:00`);
}

export interface DueCheckResult {
  isDue: boolean;
  minutesUntilStart: number;
}

/**
 * An item is "due" for its reminder from the moment it enters the
 * configured window (minutesUntilStart <= reminderMinutes) until it
 * starts (minutesUntilStart >= 0). Whichever background-job run first
 * observes that window is the one that sends it — de-duplication (see
 * notification_log in schema.sql) guarantees only one send happens no
 * matter how many times the job runs while the item stays in the window.
 */
export function checkDue(startInstant: Date, now: Date, reminderMinutes: number): DueCheckResult {
  const minutesUntilStart = (startInstant.getTime() - now.getTime()) / 60000;
  return {
    isDue: minutesUntilStart >= 0 && minutesUntilStart <= reminderMinutes,
    minutesUntilStart,
  };
}

/** Dedup key for a shift reminder — changes if the shift's start time is edited. */
export function shiftDedupKey(shiftId: string, shiftDate: string, startTime: string, reminderMinutes: number) {
  return `shift:${shiftId}:${shiftDate}T${startTime.slice(0, 5)}:${reminderMinutes}`;
}

/** Dedup key for an activity reminder — changes if the activity's start time is edited. */
export function activityDedupKey(
  activityId: string,
  activityDate: string,
  startTime: string,
  reminderMinutes: number
) {
  return `activity:${activityId}:${activityDate}T${startTime.slice(0, 5)}:${reminderMinutes}`;
}

/** Dedup key for a conflict alert — changes if either the activity's or the shift's time is edited. */
export function conflictDedupKey(
  activityId: string,
  activityDate: string,
  activityStart: string,
  shiftId: string,
  shiftStart: string
) {
  return `conflict:${activityId}:${activityDate}T${activityStart.slice(0, 5)}:${shiftId}:${shiftStart.slice(0, 5)}`;
}
