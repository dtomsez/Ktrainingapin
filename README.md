# แบบฟอร์มการขอจัดประชุม/อบรม

ระบบขอจัดประชุม/อบรม สำหรับพนักงานสายงานเครือข่ายธุรกิจขนาดเล็กและรายย่อย
สร้างด้วย Next.js 15 + Prisma + Tailwind CSS (โทนสีธนาคารกรุงไทย)

## ความสามารถ

- **ยื่นคำขอ** (`/`) — เปิดสาธารณะ: ฟอร์มพร้อม dropdown สังกัดสายงาน/สำนักงานเขต/กลุ่มเครือข่าย,
  เสนอวันได้ 2 ทางเลือก, คำนวณชั่วโมงอัตโนมัติ, เลือกตำแหน่งผู้เข้าอบรมได้หลายตำแหน่ง
- **ติดตามสถานะ** (`/track`) — เปิดสาธารณะ: ค้นด้วยเลขที่คำขอ (TR-ปี-เลขลำดับ)
- **ฝั่งผู้อนุมัติ** (`/admin`) — ต้องใส่รหัสผ่าน: คิวอนุมัติ 3 ขั้นเรียงลำดับ,
  เตือนวันเวลาทับซ้อน, Dashboard ปฏิทินรายเดือน + สรุปรายปี, Data Control จัดการ dropdown,
  ดาวน์โหลดข้อมูลเป็น Excel

## เริ่มใช้งาน (local)

```bash
npm install
npx prisma db push   # สร้างฐานข้อมูล SQLite
npm run db:seed      # ตัวเลือก dropdown + ผู้อนุมัติเริ่มต้น
npm run dev          # เปิด http://localhost:3000
```

ตั้งค่าใน `.env`:

| ตัวแปร | ความหมาย | ค่าเริ่มต้น |
|---|---|---|
| `DATABASE_URL` | ที่อยู่ฐานข้อมูล | `file:./dev.db` |
| `ADMIN_PASSWORD` | รหัสผ่านหน้าผู้อนุมัติ | `krungthai123` |
| `SESSION_SECRET` | กุญแจเซ็น cookie | (ควรเปลี่ยนใน production) |
| `RESEND_API_KEY` | คีย์ส่งอีเมลจริงผ่าน Resend (เว้นว่าง = log ลง console) | – |
| `APP_URL` | URL ของเว็บ ใช้ในลิงก์ในอีเมล | `http://localhost:3000` |

## Deploy บน Vercel

โปรเจกต์นี้ deploy ขึ้น Vercel ได้ทันที (`vercel-build` จะสร้าง + seed ฐานข้อมูล SQLite ตอน build
แล้ว runtime ก๊อปไปที่ `/tmp`)

> ⚠️ **ข้อมูลบน Vercel + SQLite เป็นแบบชั่วคราว** — หายเมื่อ redeploy หรือเครื่อง serverless
> ถูกรีเซ็ต เหมาะสำหรับเดโม/ทดสอบเท่านั้น
>
> สำหรับใช้งานจริง: สร้าง Postgres (เช่น Neon ผ่านแท็บ Storage ของ Vercel) แล้ว
> 1. เปลี่ยน `provider = "sqlite"` เป็น `"postgresql"` ใน `prisma/schema.prisma`
> 2. ตั้ง env `DATABASE_URL` ใน Vercel ให้ชี้ Postgres
> 3. Redeploy — ข้อมูลจะถาวรทันที
