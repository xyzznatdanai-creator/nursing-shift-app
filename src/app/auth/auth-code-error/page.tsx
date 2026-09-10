import Link from "next/link";
import AuthCard from "@/components/AuthCard";

export default function AuthCodeErrorPage() {
  return (
    <AuthCard title="ยืนยันอีเมลไม่สำเร็จ">
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          ลิงก์ยืนยันอีเมลไม่ถูกต้องหรือหมดอายุแล้ว กรุณาลองเข้าสู่ระบบ
          หรือสมัครบัญชีใหม่อีกครั้ง
        </div>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-700"
        >
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </AuthCard>
  );
}
