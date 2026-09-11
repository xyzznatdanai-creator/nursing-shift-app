/**
 * The set of shift types the app knows about. `value` is what's stored in
 * `shifts.shift_type` (plain text in the database — not a fixed enum), so
 * adding a new type later is just adding another entry here. Nothing else
 * needs to change: the form, the list, the calendar, and the dashboard all
 * read from this array.
 */
export interface ShiftTypeDef {
  value: string;
  emoji: string;
  badgeClass: string;
  dotClass: string;
}

export const SHIFT_TYPES: ShiftTypeDef[] = [
  {
    value: "เช้า",
    emoji: "☀️",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-400",
  },
  {
    value: "บ่าย",
    emoji: "🌤️",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
    dotClass: "bg-sky-400",
  },
  {
    value: "ดึก",
    emoji: "🌙",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
    dotClass: "bg-indigo-400",
  },
  {
    value: "หยุด",
    emoji: "⭕",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
];

const DEFAULT_TYPE: ShiftTypeDef = {
  value: "",
  emoji: "🕐",
  badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  dotClass: "bg-slate-400",
};

export function getShiftTypeDef(value: string): ShiftTypeDef {
  return SHIFT_TYPES.find((t) => t.value === value) ?? { ...DEFAULT_TYPE, value };
}
