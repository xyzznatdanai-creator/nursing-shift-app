import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { logout } from "@/app/dashboard/actions";

export default function AppNav({ active }: { active: "dashboard" | "shifts" | "settings" }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6 sm:py-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="whitespace-nowrap text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            Nursing Shift
          </span>
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                active === "dashboard"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              แดชบอร์ด
            </Link>
            <Link
              href="/shifts"
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                active === "shifts" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              ตารางเวร
            </Link>
            <Link
              href="/settings/notifications"
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                active === "settings" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              การแจ้งเตือน
            </Link>
          </nav>
        </div>
        <LogoutButton action={logout} />
      </div>
    </header>
  );
}
