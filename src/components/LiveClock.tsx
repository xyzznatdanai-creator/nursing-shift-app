"use client";

import { useEffect, useState } from "react";

const TIME_ZONE = "Asia/Bangkok";

const dateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * Live-updating date + time in Asia/Bangkok, ticking every second on the
 * client. Rendered only after mount to avoid a server/client render
 * mismatch (the server-rendered time would already be stale by the time
 * the client hydrates).
 */
export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    // Kick off the first tick asynchronously (rather than calling setState
    // synchronously in the effect body) so React treats this purely as a
    // subscription to the "system clock", ticking once per second.
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          วันนี้
        </p>
        <p className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">
          {now ? dateFormatter.format(now) : "—"}
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          เวลา (Asia/Bangkok)
        </p>
        <p className="mt-1 font-mono text-lg font-semibold text-slate-900 sm:text-xl">
          {now ? timeFormatter.format(now) : "—"}
        </p>
      </div>
    </div>
  );
}
