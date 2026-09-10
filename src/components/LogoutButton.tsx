"use client";

import { useFormStatus } from "react-dom";

function LogoutSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400/50 border-t-slate-600"
          aria-hidden="true"
        />
      ) : null}
      {pending ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}

export default function LogoutButton({
  action,
}: {
  action: () => Promise<void>;
}) {
  return (
    <form action={action}>
      <LogoutSubmitButton />
    </form>
  );
}
