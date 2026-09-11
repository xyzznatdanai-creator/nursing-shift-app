/**
 * Maps Postgres/Supabase error messages to user-friendly Thai messages for
 * non-auth database operations (shifts, etc). Falls back to the raw
 * message when nothing matches, so unexpected errors are never silently
 * swallowed.
 */
export function translateDbError(message: string | undefined | null): string {
  if (!message) {
    return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง";
  }

  const m = message.toLowerCase();

  if (m.includes("fetch failed") || m.includes("network") || m.includes("failed to fetch")) {
    return "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง";
  }
  if (m.includes("jwt") || m.includes("permission denied") || m.includes("row-level security")) {
    return "ไม่มีสิทธิ์ทำรายการนี้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง";
  }
  if (m.includes("violates not-null constraint")) {
    return "กรุณากรอกข้อมูลให้ครบถ้วน";
  }

  return "บันทึกข้อมูลไม่สำเร็จ: " + message;
}
