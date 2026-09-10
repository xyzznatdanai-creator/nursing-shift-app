# Nursing Shift — Phase 1 (Foundation / Authentication / Empty State)

ระบบจัดการตารางเวรพยาบาล — **Phase 1** วางรากฐานระบบ Authentication, Cloud
Database และหน้า Dashboard เปล่า (Empty State) ที่ใช้งานจริงได้ ไม่ใช่ Demo

**Stack:** Next.js (App Router, TypeScript) + Supabase (Postgres + Auth +
Row Level Security) + Tailwind CSS + Vercel

---

## 1. สิ่งที่ทำไว้แล้วใน Phase 1

- สมัครบัญชี (Email + Password) พร้อม Validation และแจ้ง Error เป็นภาษาไทย
- ยืนยันอีเมล (Supabase ส่งลิงก์ยืนยันให้อัตโนมัติ)
- เข้าสู่ระบบ / ออกจากระบบ
- Session คงอยู่เมื่อ Refresh หน้า และใช้งานได้จากอุปกรณ์ไหนก็ได้ (ข้อมูลอยู่บน
  Supabase ไม่ผูกกับเครื่อง)
- หน้า Dashboard แสดงวันที่ / เวลาปัจจุบัน (Timezone Asia/Bangkok, อัปเดตทุกวินาที)
  และ Empty State "ยังไม่มีข้อมูล"
- บัญชีใหม่ทุกบัญชีเริ่มต้นด้วยข้อมูล 0 รายการ — ไม่มี Demo/Seed Data
- Row Level Security ในระดับฐานข้อมูล: ผู้ใช้แต่ละคนเห็นเฉพาะข้อมูลของตัวเอง
- Responsive ใช้งานได้ทั้ง Desktop / Tablet / Mobile
- Loading state, Error state (รวมถึง Network Error), Empty state ครบทุกหน้า
- Secret ทั้งหมดอยู่ใน Environment Variables ไม่ Hardcode ในโค้ด

**ยังไม่ทำ (ตาม Scope):** ระบบจัดการเวรจริง, AI, Notification, ระบบแลกเวร,
Chat, Statistics, Admin, Payment ฯลฯ — ทั้งหมดนี้รอ Phase ถัดไป

---

## 2. ขั้นตอนที่ 1 — สร้างโปรเจกต์ Supabase

1. ไปที่ [supabase.com](https://supabase.com) แล้วสมัคร/เข้าสู่ระบบ (ใช้ฟรีได้)
2. กด **New Project** ตั้งชื่อโปรเจกต์ (เช่น `nursing-shift`) เลือก Region ที่ใกล้
   ที่สุด (เช่น Singapore) ตั้งรหัสผ่านฐานข้อมูล แล้วกด **Create new project**
   (รอประมาณ 1-2 นาที)
3. เมื่อโปรเจกต์พร้อมแล้ว ไปที่ **Project Settings → API**
   - คัดลอกค่า **Project URL** → จะใช้เป็น `NEXT_PUBLIC_SUPABASE_URL`
   - คัดลอกค่า **anon public** key → จะใช้เป็น `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **ห้ามคัดลอกหรือใช้ `service_role` key ในโค้ดฝั่ง Frontend เด็ดขาด**
     (คีย์นี้ข้าม Row Level Security ได้ทั้งหมด)

### สร้างตารางฐานข้อมูล + Row Level Security

1. ในเมนูซ้ายของ Supabase ไปที่ **SQL Editor → New query**
2. เปิดไฟล์ [`supabase/schema.sql`](./supabase/schema.sql) ในโปรเจกต์นี้
   คัดลอกทั้งหมดไปวาง แล้วกด **Run**
3. ตรวจสอบว่ารันสำเร็จ (จะเห็นตาราง `profiles` และ `shifts` ใน **Table Editor**
   และทั้งสองตารางมี "RLS enabled")

Schema นี้สร้าง:
- `profiles` — ข้อมูลบัญชีผู้ใช้ (สร้างอัตโนมัติทุกครั้งที่มีคนสมัครใหม่)
- `shifts` — ตารางเปล่า เตรียมไว้สำหรับฟีเจอร์จัดการเวรใน Phase 2 (Phase 1 ยัง
  ไม่มี UI เขียนข้อมูลลงตารางนี้)
- Policy ที่บังคับว่า `auth.uid() = user_id` เสมอ ทั้งตอนอ่านและเขียน — ทำให้
  User A ไม่สามารถเห็นหรือแก้ไขข้อมูลของ User B ได้แม้จะพยายามเรียก API ตรงๆ

### ตั้งค่าการยืนยันอีเมล (แนะนำ)

โปรเจกต์ Supabase ใหม่จะเปิด "Confirm email" ไว้เป็นค่าเริ่มต้นอยู่แล้ว (ที่
**Authentication → Providers → Email**) ซึ่งตรงกับที่แอปนี้ออกแบบไว้ (มีหน้า
`/auth/callback` รองรับลิงก์ยืนยันจากอีเมล) ไม่ต้องแก้ไขอะไรเพิ่ม

สำหรับการทดสอบในเครื่อง (localhost) ให้ไปที่ **Authentication → URL
Configuration** แล้วเพิ่ม `http://localhost:3000/auth/callback` ใน **Redirect
URLs** (ค่า Site URL จะตั้งเป็นโดเมนจริงตอน Deploy ในขั้นตอนที่ 4)

---

## 3. ขั้นตอนที่ 2 — รันโปรเจกต์บนเครื่องของคุณ

ต้องมี [Node.js](https://nodejs.org) เวอร์ชัน 20 ขึ้นไป

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้างไฟล์ environment variables
cp .env.local.example .env.local
```

เปิดไฟล์ `.env.local` แล้วใส่ค่าจาก Supabase (ขั้นตอนที่ 1):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
# 3. รันเซิร์ฟเวอร์สำหรับพัฒนา
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) — ระบบจะพาไปหน้า Login
โดยอัตโนมัติ ลองกด "สมัครบัญชีใหม่" เพื่อทดสอบทั้งระบบ

> ไฟล์ `.env.local` ถูกใส่ไว้ใน `.gitignore` แล้ว จะไม่ถูก commit ขึ้น Git
> โดยไม่ได้ตั้งใจ

---

## 4. ขั้นตอนที่ 3 — Deploy ขึ้น Production (Vercel)

1. Push โค้ดนี้ขึ้น GitHub (สร้าง repo ใหม่แล้ว push)
2. ไปที่ [vercel.com](https://vercel.com) → **Add New → Project** → เลือก
   repo ที่เพิ่ง push
3. ที่หน้าตั้งค่าโปรเจกต์ เปิด **Environment Variables** แล้วเพิ่ม 2 ตัวเดียวกับ
   `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. กด **Deploy** — รอสักครู่จะได้โดเมน production (เช่น
   `https://nursing-shift.vercel.app`)
5. กลับไปที่ Supabase → **Authentication → URL Configuration**:
   - ตั้ง **Site URL** เป็นโดเมน production ของคุณ
   - เพิ่ม `https://<โดเมนของคุณ>/auth/callback` ใน **Redirect URLs**

เท่านี้ระบบก็ใช้งานได้จริงจากอุปกรณ์ไหนก็ได้ — สมัครบัญชีบนเครื่องหนึ่ง แล้ว
เข้าสู่ระบบด้วยบัญชีเดิมจากอีกเครื่องหนึ่งได้ทันที เพราะข้อมูลทั้งหมดอยู่บน
Supabase ไม่ได้ผูกกับ Browser หรือเครื่องใดเครื่องหนึ่ง

---

## 5. โครงสร้างโปรเจกต์

```
src/
  app/
    page.tsx                  → redirect ไป /login หรือ /dashboard ตามสถานะล็อกอิน
    login/page.tsx             → หน้าเข้าสู่ระบบ
    register/page.tsx          → หน้าสมัครบัญชี
    dashboard/page.tsx         → หน้าหลักหลังล็อกอิน (Empty State + นาฬิกา)
    dashboard/actions.ts        → Server Action สำหรับออกจากระบบ
    auth/callback/route.ts      → รับลิงก์ยืนยันอีเมลจาก Supabase
  components/                  → UI components ที่ใช้ร่วมกัน
  lib/
    supabase/client.ts          → Supabase client ฝั่ง Browser
    supabase/server.ts          → Supabase client ฝั่ง Server
    supabase/middleware.ts      → Logic ตรวจสอบ session + ป้องกันเส้นทาง
    auth-errors.ts              → แปล Error ของ Supabase เป็นภาษาไทย
  proxy.ts                      → รัน updateSession() ทุก request (เดิมเรียกว่า middleware)
supabase/
  schema.sql                    → SQL สร้างตาราง + Row Level Security
```

โครงสร้างนี้ถูกจัดวางให้ต่อยอด Phase 2 (ระบบจัดการเวรจริง) ได้ง่าย — ตาราง
`shifts` และ RLS ถูกเตรียมไว้แล้ว เหลือแค่สร้างหน้า UI และฟอร์มสำหรับ
เพิ่ม/แก้ไข/ลบเวรในภายหลัง

---

## 6. หมายเหตุด้านความปลอดภัย

- Password ถูกจัดการโดย Supabase Auth (เก็บแบบ hashed) — โค้ดฝั่ง Frontend
  ไม่เคยเห็นหรือเก็บ Password แบบ Plain Text
- Session ถูกเก็บเป็น HTTP-only cookie ผ่าน `@supabase/ssr` — ไม่ได้เก็บ Token
  ไว้ใน localStorage แบบเปิดเผย
- ทุก Query ไปยังฐานข้อมูลถูกกรองด้วย Row Level Security ที่ระดับ Postgres
  ไม่ได้พึ่งพาการซ่อนข้อมูลใน Frontend เพียงอย่างเดียว
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ปลอดภัยที่จะเปิดเผยในโค้ดฝั่ง Browser — คีย์
  นี้ถูกออกแบบมาให้ใช้คู่กับ RLS อยู่แล้ว ส่วน `service_role` key (ที่ข้าม RLS
  ได้) **ไม่ได้ใช้และไม่ควรใช้ในแอปนี้เลย**
