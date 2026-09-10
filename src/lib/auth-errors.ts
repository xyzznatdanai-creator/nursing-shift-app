/**
 * Maps Supabase Auth error messages (English, from the API) to
 * user-friendly Thai messages. Supabase doesn't return stable error codes
 * for every case, so this matches on substrings of the known messages.
 */
export function translateAuthError(message: string | undefined | null): string {
  if (!message) {
    return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง";
  }

  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }
  if (m.includes("email not confirmed")) {
    return "กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ (ตรวจสอบกล่องจดหมายของคุณ)";
  }
  if (m.includes("user already registered") || m.includes("already registered")) {
    return "อีเมลนี้ถูกใช้สมัครบัญชีไปแล้ว กรุณาเข้าสู่ระบบแทน";
  }
  if (m.includes("password should be at least")) {
    return "รหัสผ่านสั้นเกินไป กรุณาตั้งรหัสผ่านให้ยาวขึ้น";
  }
  if (m.includes("unable to validate email address") || m.includes("invalid email")) {
    return "รูปแบบอีเมลไม่ถูกต้อง";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "มีการร้องขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
  }
  if (m.includes("fetch failed") || m.includes("network") || m.includes("failed to fetch")) {
    return "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง";
  }

  return message;
}
