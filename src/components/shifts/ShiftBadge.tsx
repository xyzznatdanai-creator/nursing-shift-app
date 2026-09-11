import { getShiftTypeDef } from "@/lib/shift-types";

export default function ShiftBadge({ shiftType }: { shiftType: string }) {
  const def = getShiftTypeDef(shiftType);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${def.badgeClass}`}
    >
      <span aria-hidden="true">{def.emoji}</span>
      {def.value || shiftType}
    </span>
  );
}
