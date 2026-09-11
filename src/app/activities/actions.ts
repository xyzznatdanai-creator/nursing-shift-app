"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { translateDbError } from "@/lib/db-errors";

export interface ActivityInput {
  activity_date: string;
  title: string;
  start_time: string;
  end_time: string;
  notes: string;
}

function validateActivityInput(input: ActivityInput): string | null {
  if (!input.title || !input.title.trim()) return "กรุณาระบุชื่อกิจกรรม";
  if (!input.activity_date) return "กรุณาเลือกวันที่";
  if (!input.start_time) return "กรุณาระบุเวลาเริ่ม";
  if (!input.end_time) return "กรุณาระบุเวลาสิ้นสุด";
  if (input.start_time === input.end_time) {
    return "เวลาเริ่มและเวลาสิ้นสุดต้องไม่เท่ากัน";
  }
  return null;
}

function refresh() {
  revalidatePath("/shifts");
  revalidatePath("/dashboard");
}

export async function createActivity(input: ActivityInput): Promise<{ error?: string }> {
  const validationError = validateActivityInput(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  const { error } = await supabase.from("activities").insert({
    user_id: user.id,
    activity_date: input.activity_date,
    title: input.title.trim(),
    start_time: input.start_time,
    end_time: input.end_time,
    notes: input.notes.trim() || null,
  });

  if (error) return { error: translateDbError(error.message) };

  refresh();
  return {};
}

export async function updateActivity(
  id: string,
  input: ActivityInput
): Promise<{ error?: string }> {
  const validationError = validateActivityInput(input);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  // .eq("user_id", user.id) here is defense in depth for clarity — Row
  // Level Security on the `activities` table already guarantees a user can
  // never update a row that isn't their own, even without this filter.
  const { error, count } = await supabase
    .from("activities")
    .update(
      {
        activity_date: input.activity_date,
        title: input.title.trim(),
        start_time: input.start_time,
        end_time: input.end_time,
        notes: input.notes.trim() || null,
      },
      { count: "exact" }
    )
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: translateDbError(error.message) };
  if (count === 0) return { error: "ไม่พบกิจกรรมนี้ อาจถูกลบไปแล้ว" };

  refresh();
  return {};
}

export async function deleteActivity(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง" };

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: translateDbError(error.message) };

  refresh();
  return {};
}
