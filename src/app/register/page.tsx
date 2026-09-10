"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import AuthCard from "@/components/AuthCard";
import FormField from "@/components/FormField";
import SubmitButton from "@/components/SubmitButton";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function validate(): boolean {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = "กรุณากรอกอีเมล";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
    }

    if (!password) {
      errors.password = "กรุณากรอกรหัสผ่าน";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
    }

    if (!confirmPassword) {
      errors.confirmPassword = "กรุณายืนยันรหัสผ่าน";
    } else if (password && confirmPassword !== password) {
      errors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setFormError(translateAuthError(error.message));
        return;
      }

      // If the Supabase project has email confirmation disabled, signUp
      // returns an active session immediately — send the user straight in.
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      // Otherwise (the default for new Supabase projects), the user must
      // confirm their email before they can log in.
      setSuccessMessage(
        "สมัครบัญชีสำเร็จ กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันการสมัครก่อนเข้าสู่ระบบ"
      );
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setFormError(
        "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="สมัครบัญชีใหม่" subtitle="สร้างบัญชีเพื่อเริ่มใช้งาน">
      {successMessage ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
            {successMessage}
          </div>
          <Link
            href="/login"
            className="block w-full rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-slate-700"
          >
            ไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {formError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {formError}
            </div>
          ) : null}

          <FormField
            id="email"
            label="อีเมล"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            disabled={loading}
          />

          <FormField
            id="password"
            label="รหัสผ่าน"
            type="password"
            autoComplete="new-password"
            placeholder="อย่างน้อย 6 ตัวอักษร"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            disabled={loading}
          />

          <FormField
            id="confirmPassword"
            label="ยืนยันรหัสผ่าน"
            type="password"
            autoComplete="new-password"
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            disabled={loading}
          />

          <SubmitButton loading={loading} loadingText="กำลังสมัคร...">
            สมัครบัญชี
          </SubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-semibold text-slate-900 hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </AuthCard>
  );
}
