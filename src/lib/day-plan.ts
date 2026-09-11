// ============================================================================
// V1.2 — Personal Planning: helpers for combining one day's shifts and
// personal activities into a single picture (overlap checks, free time,
// and the Daily Timeline).
//
// All times here are plain wall-clock "HH:MM" (Asia/Bangkok — the app never
// lets a user pick a timezone), converted to "minutes since 00:00 of the
// selected day" so they can be compared and merged with simple arithmetic.
//
// Overnight shifts (e.g. 22:00 → 08:00) are anchored to `shift_date`, same
// as V1.1: for the purposes of THIS day's timeline / free-time / overlap
// math, an overnight shift is treated as running from its start time to
// 24:00 (midnight) — it does not "spill over" onto the next calendar day's
// timeline, because the shift row itself only ever belongs to one date.
// ============================================================================

import { formatTime, isOvernightShift, type ShiftRow } from "./shift-time";

const MINUTES_PER_DAY = 24 * 60;

export interface ActivityRow {
  id: string;
  activity_date: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export function sortActivities(activities: ActivityRow[]): ActivityRow[] {
  return [...activities].sort((a, b) => {
    if (a.activity_date !== b.activity_date) {
      return a.activity_date < b.activity_date ? -1 : 1;
    }
    return formatTime(a.start_time) < formatTime(b.start_time) ? -1 : 1;
  });
}

/** "08:00" / "08:00:00" -> 480 */
function toMinutes(time: string): number {
  const t = formatTime(time);
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** 480 -> "08:00", 1440 -> "24:00" */
export function minutesToLabel(min: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_PER_DAY, min));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface Interval {
  start: number;
  end: number;
}

/** A shift's busy interval *for its own `shift_date`* — capped at 24:00. */
function shiftInterval(shift: ShiftRow): Interval {
  const start = toMinutes(shift.start_time);
  const end = isOvernightShift(shift.start_time, shift.end_time)
    ? MINUTES_PER_DAY
    : toMinutes(shift.end_time);
  return { start, end: Math.max(end, start) };
}

/** An activity's busy interval for its own `activity_date` — capped at 24:00. */
function activityInterval(activity: ActivityRow): Interval {
  const start = toMinutes(activity.start_time);
  const rawEnd = toMinutes(activity.end_time);
  const end = rawEnd <= start ? MINUTES_PER_DAY : rawEnd;
  return { start, end: Math.max(end, start) };
}

function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Does this activity's time range overlap any of the day's shifts?
 * Used for the "⚠️ กิจกรรมนี้อยู่ในช่วงเวลาที่มีเวร" warning — informational
 * only, the user decides whether to keep the activity as-is.
 */
export function activityOverlapsAnyShift(
  activityStart: string,
  activityEnd: string,
  dayShifts: ShiftRow[]
): boolean {
  const a = activityInterval({
    id: "",
    activity_date: "",
    title: "",
    start_time: activityStart,
    end_time: activityEnd,
    notes: null,
  });
  return dayShifts.some((s) => intervalsOverlap(a, shiftInterval(s)));
}

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [{ ...sorted[0] }];
  for (const cur of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Free (unscheduled) minute ranges left in the day, sorted chronologically. */
export function computeFreeGaps(dayShifts: ShiftRow[], dayActivities: ActivityRow[]): Interval[] {
  const busy = mergeIntervals([
    ...dayShifts.map(shiftInterval),
    ...dayActivities.map(activityInterval),
  ]);

  const gaps: Interval[] = [];
  let cursor = 0;
  for (const b of busy) {
    if (b.start > cursor) gaps.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < MINUTES_PER_DAY) gaps.push({ start: cursor, end: MINUTES_PER_DAY });
  return gaps.filter((g) => g.end > g.start);
}

export type TimelineBlockKind = "shift" | "activity" | "free";

export interface TimelineBlock {
  kind: TimelineBlockKind;
  start: number;
  end: number;
  id: string;
  title: string;
  subtitle?: string;
  overnight?: boolean;
}

/** Every busy + free block for one day, in chronological order. */
export function buildDailyTimeline(
  dayShifts: ShiftRow[],
  dayActivities: ActivityRow[]
): TimelineBlock[] {
  const blocks: TimelineBlock[] = [];

  for (const s of dayShifts) {
    const { start, end } = shiftInterval(s);
    blocks.push({
      kind: "shift",
      start,
      end,
      id: s.id,
      title: s.shift_type,
      overnight: isOvernightShift(s.start_time, s.end_time),
    });
  }

  for (const a of dayActivities) {
    const { start, end } = activityInterval(a);
    blocks.push({
      kind: "activity",
      start,
      end,
      id: a.id,
      title: a.title,
    });
  }

  for (const gap of computeFreeGaps(dayShifts, dayActivities)) {
    blocks.push({
      kind: "free",
      start: gap.start,
      end: gap.end,
      id: `free-${gap.start}-${gap.end}`,
      title: "ว่าง",
    });
  }

  return blocks.sort((a, b) => a.start - b.start || a.end - b.end);
}
