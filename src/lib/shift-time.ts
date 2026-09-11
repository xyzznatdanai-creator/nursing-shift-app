const TIME_ZONE = "Asia/Bangkok";

/**
 * Today's date in Asia/Bangkok, as "YYYY-MM-DD" — matches Postgres `date`
 * formatting so it can be compared directly against `shift_date`. Computed
 * from the timezone explicitly rather than `new Date().toISOString()`,
 * because the server this runs on is not necessarily in Thailand.
 */
export function todayInBangkok(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

/** "2026-09-11" -> "11 กันยายน 2026" */
export function formatThaiDate(isoDate: string): string {
  // Parse as a plain calendar date (no timezone conversion) — a `date`
  // column has no time component, so treat it as a wall-clock day rather
  // than letting `new Date("2026-09-11")` interpret it as UTC midnight,
  // which can shift a day backwards for timezones behind UTC.
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    timeZone: "UTC",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dt);
}

/** "2026-09-11" -> "11 ก.ย." (compact, for calendar cells) */
export function formatThaiDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(dt);
}

/** "08:00:00" or "08:00" -> "08:00" */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

/**
 * A shift is "overnight" when its end time is not after its start time —
 * e.g. 22:00 → 08:00. This is normal input, not an error: the shift simply
 * ends on the day after `shift_date`.
 */
export function isOvernightShift(startTime: string, endTime: string): boolean {
  return formatTime(endTime) <= formatTime(startTime);
}

export interface ShiftRow {
  id: string;
  shift_date: string;
  shift_type: string;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export function sortShifts(shifts: ShiftRow[]): ShiftRow[] {
  return [...shifts].sort((a, b) => {
    if (a.shift_date !== b.shift_date) return a.shift_date < b.shift_date ? -1 : 1;
    return formatTime(a.start_time) < formatTime(b.start_time) ? -1 : 1;
  });
}
