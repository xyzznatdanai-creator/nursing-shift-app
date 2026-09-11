import { minutesToLabel, type TimelineBlock } from "@/lib/day-plan";
import { getShiftTypeDef } from "@/lib/shift-types";

function blockStyle(kind: TimelineBlock["kind"]) {
  switch (kind) {
    case "shift":
      return { dot: "bg-amber-500", border: "border-amber-200", bg: "bg-amber-50" };
    case "activity":
      return { dot: "bg-violet-500", border: "border-violet-200", bg: "bg-violet-50" };
    default:
      return { dot: "bg-emerald-500", border: "border-emerald-100", bg: "bg-emerald-50/60" };
  }
}

export default function DailyTimeline({
  blocks,
  shiftTypeByBlockId,
}: {
  blocks: TimelineBlock[];
  /** Maps a shift block's id -> its shift_type, so we can show the right emoji. */
  shiftTypeByBlockId: Map<string, string>;
}) {
  if (blocks.length === 0) {
    return <p className="text-sm text-slate-400">ยังไม่มีตาราง</p>;
  }

  return (
    <ol className="flex flex-col">
      {blocks.map((b, i) => {
        const style = blockStyle(b.kind);
        const isLast = i === blocks.length - 1;
        const icon =
          b.kind === "shift"
            ? getShiftTypeDef(shiftTypeByBlockId.get(b.id) ?? b.title).emoji
            : b.kind === "activity"
            ? "📌"
            : null;

        return (
          <li key={`${b.kind}-${b.id}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
              {!isLast ? <span className="w-px flex-1 bg-slate-200" /> : null}
            </div>
            <div className={`mb-3 flex-1 rounded-lg border px-3 py-2 ${style.border} ${style.bg}`}>
              <p className="text-xs font-medium text-slate-500">
                {minutesToLabel(b.start)} – {minutesToLabel(b.end)}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                {icon ? <span aria-hidden="true">{icon}</span> : null}
                {b.kind === "free" ? "ว่าง" : b.title}
                {b.overnight ? <span className="text-xs font-medium text-indigo-600">🌙 ข้ามวัน</span> : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
