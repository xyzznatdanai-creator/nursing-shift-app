"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import AuthCard from "@/components/AuthCard";
import FormField from "@/components/FormField";
import SubmitButton from "@/components/SubmitButton";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  email?: string;
  password?: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = "กรุณากรอกอีเมล";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
    }

    if (!password) {
      errors.password = "กรุณากรอกรหัสผ่าน";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setFormError(translateAuthError(error.message));
        return;
      }

      router.push(redirectedFrom || "/dashboard");
      router.refresh();
    } catch {
      setFormError(
        "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="เข้าสู่ระบบ" subtitle="ยินดีต้อนรับกลับมา">
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
          autoComplete="current-password"
          placeholder="รหัสผ่านของคุณ"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          disabled={loading}
        />

        <SubmitButton loading={loading} loadingText="กำลังเข้าสู่ระบบ...">
          เข้าสู่ระบบ
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ยังไม่มีบัญชี?{" "}
        <Link href="/register" className="font-semibold text-slate-900 hover:underline">
          สมัครบัญชีใหม่
        </Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
