// ============================================================================
// V1.3 — Smart Schedule (rule-based, no AI/ML): turns the shifts and
// activities a user already entered into conflict warnings, work/off-day
// classification, monthly totals, and "what's coming up" lists.
//
// Every function here is a pure computation over data the caller already
// fetched (via RLS-scoped queries) — nothing here talks to the database, so
// none of it adds extra round-trips, and all of it is cheap enough to run
// on every render without memoization mattering much (callers still wrap
// the expensive ones in useMemo to avoid recompute on unrelated re-renders).
// ============================================================================

import { formatThaiDateShort, type ShiftRow } from "./shift-time";
import {
  activityInterval,
  intervalIntersection,
  intervalsOverlap,
  shiftInterval,
  type ActivityRow,
} from "./day-plan";
import { SHIFT_TYPES } from "./shift-types";

/** The shift type that represents an explicit day off (not "no shift entered"). */
const DAY_OFF_SHIFT_TYPE = "หยุด";

export type ConflictLevel = "none" | "partial" | "full";

export interface ActivityConflict {
  level: ConflictLevel;
  /** Present when level is "partial" or "full" — the overlapping minute range. */
  overlapStart?: number;
  overlapEnd?: number;
  shift?: ShiftRow;
}

/**
 * How badly one activity's time range conflicts with the day's shifts.
 * "full"    — the activity's whole time range falls inside a single shift.
 * "partial" — the activity overlaps a shift but extends outside it too.
 * "none"    — no overlap with any shift.
 * When more than one shift conflicts, the worst level wins.
 */
export function checkActivityConflict(activity: ActivityRow, dayShifts: ShiftRow[]): ActivityConflict {
  const a = activityInterval(activity);
  let best: ActivityConflict = { level: "none" };

  for (const s of dayShifts) {
    const si = shiftInterval(s);
    if (!intervalsOverlap(a, si)) continue;

    const full = a.start >= si.start && a.end <= si.end;
    const level: ConflictLevel = full ? "full" : "partial";
    const overlap = intervalIntersection(a, si);

    // "full" always wins over "partial"; between equals, keep the first found.
    if (best.level === "none" || (level === "full" && best.level !== "full")) {
      best = { level, overlapStart: overlap?.start, overlapEnd: overlap?.end, shift: s };
    }
  }

  return best;
}

export interface DayConflictSummary {
  /** Worst conflict level across all of the day's activities. */
  level: ConflictLevel;
  /** How many activities have some conflict (partial or full). */
  conflictCount: number;
}

export function summarizeDayConflicts(
  dayShifts: ShiftRow[],
  dayActivities: ActivityRow[]
): DayConflictSummary {
  let level: ConflictLevel = "none";
  let conflictCount = 0;

  for (const activity of dayActivities) {
    const c = checkActivityConflict(activity, dayShifts);
    if (c.level === "full") {
      conflictCount += 1;
      level = "full";
    } else if (c.level === "partial") {
      conflictCount += 1;
      if (level !== "full") level = "partial";
    }
  }

  return { level, conflictCount };
}

export type DayWorkStatus = "work" | "off" | "none";

export interface DayWorkStatusInfo {
  status: DayWorkStatus;
  icon: string;
  label: string;
}

/**
 * Classifies a day from its shifts alone — never invents data for a day
 * with zero shifts recorded ("none" / "ไม่มีเวร" instead of guessing).
 */
export function classifyDayWorkStatus(dayShifts: ShiftRow[]): DayWorkStatusInfo {
  if (dayShifts.length === 0) {
    return { status: "none", icon: "⚪", label: "ไม่มีเวร" };
  }
  const workShifts = dayShifts.filter((s) => s.shift_type !== DAY_OFF_SHIFT_TYPE);
  if (workShifts.length === 0) {
    return { status: "off", icon: "🟢", label: "วันหยุด" };
  }
  const hasNightShift = workShifts.some((s) => s.shift_type === "ดึก");
  return { status: "work", icon: hasNightShift ? "🌙" : "🔴", label: "วันทำงาน" };
}

export interface MonthlyOverview {
  totalDays: number;
  workDays: number;
  /** Every day in the month that isn't a work day — explicit "หยุด" shifts and days with no shift at all, combined. */
  nonWorkDays: number;
  /** Count of shift ROWS per shift_type, in SHIFT_TYPES order plus any custom types found. */
  shiftTypeCounts: Array<{ value: string; count: number }>;
  activityCount: number;
  conflictCount: number;
}

export function computeMonthlyOverview(
  year: number,
  month0: number, // 0-11
  monthShifts: ShiftRow[],
  monthActivities: ActivityRow[]
): MonthlyOverview {
  const totalDays = new Date(year, month0 + 1, 0).getDate();

  const shiftsByDate = new Map<string, ShiftRow[]>();
  for (const s of monthShifts) {
    const arr = shiftsByDate.get(s.shift_date) ?? [];
    arr.push(s);
    shiftsByDate.set(s.shift_date, arr);
  }

  let workDays = 0;
  for (const dayShifts of shiftsByDate.values()) {
    if (classifyDayWorkStatus(dayShifts).status === "work") workDays += 1;
  }

  const typeOrder = [...SHIFT_TYPES.map((t) => t.value)];
  for (const s of monthShifts) {
    if (!typeOrder.includes(s.shift_type)) typeOrder.push(s.shift_type);
  }
  const counts = new Map(typeOrder.map((v) => [v, 0]));
  for (const s of monthShifts) {
    counts.set(s.shift_type, (counts.get(s.shift_type) ?? 0) + 1);
  }

  const activitiesByDate = new Map<string, ActivityRow[]>();
  for (const a of monthActivities) {
    const arr = activitiesByDate.get(a.activity_date) ?? [];
    arr.push(a);
    activitiesByDate.set(a.activity_date, arr);
  }
  let conflictCount = 0;
  for (const [date, acts] of activitiesByDate) {
    conflictCount += summarizeDayConflicts(shiftsByDate.get(date) ?? [], acts).conflictCount;
  }

  return {
    totalDays,
    workDays,
    nonWorkDays: totalDays - workDays,
    shiftTypeCounts: typeOrder.map((value) => ({ value, count: counts.get(value) ?? 0 })),
    activityCount: monthActivities.length,
    conflictCount,
  };
}

/** "2026-09-11" + 1 -> "2026-09-12" (plain calendar-day arithmetic, no timezone conversion). */
export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return dt.toISOString().slice(0, 10);
}

/** "วันนี้" / "พรุ่งนี้" / "อีก N วัน" for an offset from today. */
export function relativeDayLabel(offsetDays: number): string {
  if (offsetDays === 0) return "วันนี้";
  if (offsetDays === 1) return "พรุ่งนี้";
  return `อีก ${offsetDays} วัน`;
}

export interface UpcomingDay {
  dateISO: string;
  label: string;
  shifts: ShiftRow[];
}

/**
 * Builds the "ตารางที่กำลังจะมาถึง" list for `days` days starting today.
 * `windowShifts` should already be filtered to (at least) this date range —
 * this just groups/labels them, it doesn't query anything.
 */
export function buildUpcomingSchedule(
  todayISO: string,
  windowShifts: ShiftRow[],
  days: number
): UpcomingDay[] {
  const byDate = new Map<string, ShiftRow[]>();
  for (const s of windowShifts) {
    const arr = byDate.get(s.shift_date) ?? [];
    arr.push(s);
    byDate.set(s.shift_date, arr);
  }

  const out: UpcomingDay[] = [];
  for (let i = 0; i < days; i++) {
    const dateISO = addDaysISO(todayISO, i);
    out.push({ dateISO, label: relativeDayLabel(i), shifts: byDate.get(dateISO) ?? [] });
  }
  return out;
}

/** "2026-09-13" -> "13 ก.ย." */
export function shortDateLabel(isoDate: string): string {
  return formatThaiDateShort(isoDate);
}
